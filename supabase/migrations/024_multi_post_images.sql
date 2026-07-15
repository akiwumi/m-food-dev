-- 024_multi_post_images.sql — allow community posts to carry several ordered
-- images while keeping community_posts.image_path as the first-image fallback
-- for older clients and existing RPC consumers.

create table if not exists public.community_post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  image_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.community_post_images enable row level security;

alter table public.community_post_images
  add constraint community_post_images_owner_path check (image_path like user_id::text || '/%'),
  add constraint community_post_images_sort_order check (sort_order between 0 and 5);

create index if not exists community_post_images_post_order_idx
  on public.community_post_images(post_id, sort_order);

drop policy if exists "post images visible read" on public.community_post_images;
create policy "post images visible read" on public.community_post_images for select
  to authenticated using (public.can_view_community_post(post_id));

drop policy if exists "post images owner insert" on public.community_post_images;
create policy "post images owner insert" on public.community_post_images for insert
  to authenticated with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "post images owner delete" on public.community_post_images;
create policy "post images owner delete" on public.community_post_images for delete
  to authenticated using (auth.uid() = user_id);

insert into public.community_post_images (post_id, user_id, image_path, sort_order)
select id, user_id, image_path, 0
from public.community_posts
where image_path is not null
  and not exists (
    select 1 from public.community_post_images i
    where i.post_id = community_posts.id and i.image_path = community_posts.image_path
  );

create or replace function public.community_feed(limit_n int default 50)
returns table (
  id uuid, author_id uuid, author_name text, author_avatar text,
  body text, image_path text, image_paths text[], recipe_ref text, recipe_title text, visibility text, created_at timestamptz,
  like_count bigint, liked_by_me boolean, comment_count bigint
)
language sql stable security definer set search_path = public as $$
  select cp.id, cp.user_id, p.display_name, p.avatar_url,
    cp.body,
    cp.image_path,
    coalesce(
      array_remove(array_agg(i.image_path order by i.sort_order, i.created_at) filter (where i.image_path is not null), null),
      case when cp.image_path is null then array[]::text[] else array[cp.image_path] end
    ) as image_paths,
    cp.recipe_ref, cp.recipe_title, cp.visibility, cp.created_at,
    (select count(*) from public.post_likes l where l.post_id = cp.id),
    exists (select 1 from public.post_likes l where l.post_id = cp.id and l.user_id = auth.uid()),
    (select count(*) from public.post_comments cm where cm.post_id = cp.id)
  from public.community_posts cp
  join public.profiles p on p.id = cp.user_id
  left join public.community_post_images i on i.post_id = cp.id
  where cp.user_id = auth.uid()
     or cp.visibility = 'public'
     or (cp.visibility = 'connections' and public.are_friends(auth.uid(), cp.user_id))
  group by cp.id, cp.user_id, p.display_name, p.avatar_url, cp.body, cp.image_path, cp.recipe_ref, cp.recipe_title, cp.visibility, cp.created_at
  order by cp.created_at desc
  limit greatest(1, least(limit_n, 100));
$$;

grant execute on function public.community_feed(int) to authenticated;
