-- Add video_url column to blog_articles for YouTube video embedding
ALTER TABLE public.blog_articles 
ADD COLUMN video_url TEXT DEFAULT NULL;