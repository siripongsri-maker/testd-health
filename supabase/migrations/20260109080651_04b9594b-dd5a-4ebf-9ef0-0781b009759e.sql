-- Article likes table
CREATE TABLE public.article_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(article_id, user_id)
);

-- Enable RLS
ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;

-- Policies for article likes
CREATE POLICY "Anyone can view article likes"
  ON public.article_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like articles"
  ON public.article_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes"
  ON public.article_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Article comments table
CREATE TABLE public.article_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;

-- Policies for comments
CREATE POLICY "Anyone can view article comments"
  ON public.article_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can comment"
  ON public.article_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.article_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.article_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Add author_id to blog_articles if not already user-submittable  
-- Add like_count for quick reference
ALTER TABLE public.blog_articles ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Add rejection feedback column
ALTER TABLE public.blog_articles ADD COLUMN IF NOT EXISTS rejection_feedback TEXT;

-- Update article likes trigger to sync like_count
CREATE OR REPLACE FUNCTION public.update_article_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_articles SET like_count = COALESCE(like_count, 0) + 1 WHERE id = NEW.article_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_articles SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE id = OLD.article_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_article_like_change
  AFTER INSERT OR DELETE ON public.article_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_article_like_count();

-- Update comment timestamp trigger
CREATE TRIGGER update_article_comments_updated_at
  BEFORE UPDATE ON public.article_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();