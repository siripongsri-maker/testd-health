-- Fix article_likes public data exposure
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view article likes" ON public.article_likes;

-- Create a restricted policy that only allows authenticated users to view likes
-- and only their own likes (not other users' likes)
CREATE POLICY "Users can view their own likes"
ON public.article_likes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a secure function to get like count without exposing user_ids
CREATE OR REPLACE FUNCTION public.get_article_like_count(p_article_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM public.article_likes
  WHERE article_id = p_article_id;
$$;

-- Grant execute to all users (anon and authenticated) for the count function
GRANT EXECUTE ON FUNCTION public.get_article_like_count(uuid) TO anon, authenticated;

-- Create a secure function to check if current user liked an article
CREATE OR REPLACE FUNCTION public.user_liked_article(p_article_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.article_likes
    WHERE article_id = p_article_id
      AND user_id = auth.uid()
  );
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION public.user_liked_article(uuid) TO authenticated;