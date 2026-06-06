-- 006_seed_data.sql — minimum data so the app has something to show.
-- The app reads only recipes where status = 'published' and the single
-- ranking_configs row where active = true. With an empty database the app
-- loads but shows nothing. Safe to re-run (ON CONFLICT / WHERE NOT EXISTS).

-- 1) An ACTIVE ranking config. The app needs exactly one active row.
--    Replace the {} with your real weights when ready (see src/recommendation.ts).
insert into public.ranking_configs (version, config_json, active)
values ('v1', '{}'::jsonb, true)
on conflict (version) do update set config_json = excluded.config_json, active = true;

-- 2) A couple of PUBLISHED recipes so the feed isn't empty.
--    nutrition_json mirrors the shape used in src/foodAnalysis.ts.
insert into public.recipes (title, description, status, total_time_minutes, nutrition_json, tags_json, safety_json, rights_json)
select * from (values
  ('Creamy tomato pasta', 'Warm, familiar, one-pot comfort.', 'published', 25,
     '{"calories":620,"protein":18,"carbs":82,"fat":22,"fiber":8}'::jsonb,
     '{"mood":["comfort","low-energy"],"cuisine":"Italian"}'::jsonb,
     '{"allergens":["gluten","dairy"]}'::jsonb,
     '{"source":"original","license":"owned"}'::jsonb),
  ('Chicken & quinoa bowl', 'Bright, protein-forward, restorative.', 'published', 30,
     '{"calories":540,"protein":42,"carbs":48,"fat":16,"fiber":6}'::jsonb,
     '{"mood":["energize","focus"],"cuisine":"Mediterranean"}'::jsonb,
     '{"allergens":[]}'::jsonb,
     '{"source":"original","license":"owned"}'::jsonb),
  ('Lentil & vegetable soup', 'Hearty, high-fiber, gentle on the stomach.', 'published', 35,
     '{"calories":340,"protein":18,"carbs":55,"fat":6,"fiber":12}'::jsonb,
     '{"mood":["comfort","restore"],"cuisine":"Mediterranean"}'::jsonb,
     '{"allergens":[]}'::jsonb,
     '{"source":"original","license":"owned"}'::jsonb)
) as v(title, description, status, total_time_minutes, nutrition_json, tags_json, safety_json, rights_json)
where not exists (select 1 from public.recipes where recipes.title = v.title);

-- 3) (Optional) If you gate signups by invite, allow your own email in.
insert into public.invites (email, status)
values ('akiwumi@gmail.com', 'active')
on conflict (email) do nothing;
