CREATE OR REPLACE FUNCTION public.increment_article_view(p_article_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE blog_articles
  SET view_count = view_count + 1
  WHERE id = p_article_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_article_view(UUID) TO anon, authenticated;