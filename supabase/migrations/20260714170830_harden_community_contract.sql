-- Narrow the broad table grants from the publishing contract. RLS limits rows,
-- while column grants prevent owned rows being retargeted across relationships.
revoke update on public.community_posts from authenticated;
revoke update on public.post_comments from authenticated;
revoke update on public.post_likes from authenticated;
grant update (reaction) on public.post_likes to authenticated;

-- Some environments may have recorded migration 023 before its feed return
-- shape was repaired. Recreate the RPC in a fresh migration for every install.
drop function if exists public.community_feed(int);

create or replace function public.community_feed(limit_n int default 50)
returns table (
  id uuid, author_id uuid, author_name text, author_avatar text,
  body text, image_path text, recipe_ref text, recipe_title text, visibility text, created_at timestamptz,
  like_count bigint, liked_by_me boolean, comment_count bigint,
  like_reaction_count bigint, love_reaction_count bigint, applaud_reaction_count bigint, my_reaction text
)
language sql stable security definer set search_path = public as $$
  select cp.id, cp.user_id, p.display_name, p.avatar_url,
    cp.body, cp.image_path, cp.recipe_ref, cp.recipe_title, cp.visibility, cp.created_at,
    (select count(*) from public.post_likes l where l.post_id = cp.id),
    exists (select 1 from public.post_likes l where l.post_id = cp.id and l.user_id = auth.uid()),
    (select count(*) from public.post_comments cm where cm.post_id = cp.id),
    (select count(*) from public.post_likes l where l.post_id = cp.id and l.reaction = 'like'),
    (select count(*) from public.post_likes l where l.post_id = cp.id and l.reaction = 'love'),
    (select count(*) from public.post_likes l where l.post_id = cp.id and l.reaction = 'applaud'),
    (select l.reaction from public.post_likes l where l.post_id = cp.id and l.user_id = auth.uid())
  from public.community_posts cp
  join public.profiles p on p.id = cp.user_id
  where cp.user_id = auth.uid()
     or cp.visibility = 'public'
     or (cp.visibility = 'connections' and public.are_friends(auth.uid(), cp.user_id))
  order by cp.created_at desc
  limit greatest(1, least(limit_n, 100));
$$;

revoke execute on function public.community_feed(int) from public, anon;
grant execute on function public.community_feed(int) to authenticated;
