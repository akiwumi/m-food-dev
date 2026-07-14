-- 020_social_hardening.sql — two fixes surfaced while deploying 018/019:
--
-- 1. The avatars bucket predates the social feature: 005 created it PRIVATE, so
--    019's `on conflict do nothing` left it private and every avatar public URL
--    404s ("Bucket not found"). Avatars are shared content (they render in
--    people search and the community feed for other users), so flip it public.
--    Post/food photos keep their existing visibility.
update storage.buckets set public = true where id = 'avatars';

-- 2. Postgres grants EXECUTE on new functions to PUBLIC by default, so the 018
--    social RPCs were callable by the anon role (an unauthenticated caller could
--    enumerate display names via search_users). The graph RPCs are meaningless
--    without auth.uid() — restrict them to signed-in users.
revoke execute on function public.are_friends(uuid, uuid) from public, anon;
revoke execute on function public.search_users(text) from public, anon;
revoke execute on function public.send_friend_request(uuid) from public, anon;
revoke execute on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke execute on function public.remove_friend(uuid) from public, anon;
revoke execute on function public.list_friends() from public, anon;
revoke execute on function public.list_friend_requests() from public, anon;
revoke execute on function public.community_feed(int) from public, anon;
revoke execute on function public.post_comments_list(uuid) from public, anon;
