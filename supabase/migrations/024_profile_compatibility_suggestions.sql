-- 024_profile_compatibility_suggestions.sql - Phase 5 recovery:
-- friend suggestions now rank by mood/profile compatibility, not cuisine alone.

create or replace function public.suggest_friends()
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  shared_cuisines int,
  shared_moods int,
  shared_comfort_cues int,
  shared_flavors int,
  compatibility_score int
)
language sql stable security definer set search_path = public as $$
  with me as (
    select
      coalesce(food_profile_public->'cuisines', '[]'::jsonb) as cuisines,
      coalesce(food_profile_public->'cookingMoods', '[]'::jsonb) as moods,
      coalesce(food_profile_public->'comfortCues', '[]'::jsonb) || coalesce(food_profile_public->'comfortFoods', '[]'::jsonb) as comfort,
      coalesce(food_profile_public->'flavorLikes', '[]'::jsonb) || coalesce(food_profile_public->'textureLikes', '[]'::jsonb) as flavors,
      food_profile_public->>'diet' as diet
    from public.profiles where id = auth.uid()
  ),
  scored as (
    select
      p.id,
      p.display_name,
      p.avatar_url,
      (select count(*)::int from jsonb_array_elements_text(coalesce(p.food_profile_public->'cuisines', '[]'::jsonb)) as c(value)
        where c.value in (select jsonb_array_elements_text((select cuisines from me)))) as shared_cuisines,
      (select count(*)::int from jsonb_array_elements_text(coalesce(p.food_profile_public->'cookingMoods', '[]'::jsonb)) as m(value)
        where m.value in (select jsonb_array_elements_text((select moods from me)))) as shared_moods,
      (select count(*)::int from jsonb_array_elements_text(coalesce(p.food_profile_public->'comfortCues', '[]'::jsonb) || coalesce(p.food_profile_public->'comfortFoods', '[]'::jsonb)) as c(value)
        where c.value in (select jsonb_array_elements_text((select comfort from me)))) as shared_comfort_cues,
      (select count(*)::int from jsonb_array_elements_text(coalesce(p.food_profile_public->'flavorLikes', '[]'::jsonb) || coalesce(p.food_profile_public->'textureLikes', '[]'::jsonb)) as f(value)
        where f.value in (select jsonb_array_elements_text((select flavors from me)))) as shared_flavors,
      case when nullif((select diet from me), '') is not null and p.food_profile_public->>'diet' = (select diet from me) then 1 else 0 end as shared_diet
    from public.profiles p, me
    where p.id <> auth.uid()
      and coalesce(p.profile_visibility, 'connections') <> 'private'
      and coalesce(p.display_name, '') <> ''
      and not public.are_friends(auth.uid(), p.id)
      and not exists (select 1 from public.connections c
        where (c.requester_id = auth.uid() and c.addressee_id = p.id)
           or (c.requester_id = p.id and c.addressee_id = auth.uid()))
  )
  select
    scored.id,
    scored.display_name,
    scored.avatar_url,
    scored.shared_cuisines,
    scored.shared_moods,
    scored.shared_comfort_cues,
    scored.shared_flavors,
    (scored.shared_moods * 4 + scored.shared_comfort_cues * 3 + scored.shared_flavors * 2 + scored.shared_cuisines + scored.shared_diet) as compatibility_score
  from scored
  where (scored.shared_moods * 4 + scored.shared_comfort_cues * 3 + scored.shared_flavors * 2 + scored.shared_cuisines + scored.shared_diet) > 0
  order by (scored.shared_moods * 4 + scored.shared_comfort_cues * 3 + scored.shared_flavors * 2 + scored.shared_cuisines + scored.shared_diet) desc,
    scored.shared_moods desc, scored.shared_comfort_cues desc, scored.shared_flavors desc, scored.shared_cuisines desc, scored.display_name
  limit 20;
$$;
