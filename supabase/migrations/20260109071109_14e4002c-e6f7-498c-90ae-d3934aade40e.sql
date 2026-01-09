-- Create article status enum
CREATE TYPE public.article_status AS ENUM ('draft', 'pending_review', 'published', 'archived');

-- Create blog categories table
CREATE TABLE public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_en text NOT NULL,
  name_th text NOT NULL,
  description_en text,
  description_th text,
  icon text NOT NULL DEFAULT '📄',
  cover_url text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view categories"
ON public.blog_categories FOR SELECT
USING (true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
ON public.blog_categories FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create blog articles table
CREATE TABLE public.blog_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  slug text UNIQUE NOT NULL,
  title_en text NOT NULL,
  title_th text NOT NULL,
  excerpt_en text,
  excerpt_th text,
  content_en text,
  content_th text,
  cover_url text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  status article_status NOT NULL DEFAULT 'draft',
  view_count integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;

-- Anyone can view published articles
CREATE POLICY "Anyone can view published articles"
ON public.blog_articles FOR SELECT
USING (status = 'published');

-- Authors can view their own drafts
CREATE POLICY "Authors can view own articles"
ON public.blog_articles FOR SELECT
TO authenticated
USING (author_id = auth.uid());

-- Admins can view all articles
CREATE POLICY "Admins can view all articles"
ON public.blog_articles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert articles
CREATE POLICY "Admins can insert articles"
ON public.blog_articles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update articles
CREATE POLICY "Admins can update articles"
ON public.blog_articles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete articles
CREATE POLICY "Admins can delete articles"
ON public.blog_articles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_blog_articles_updated_at
BEFORE UPDATE ON public.blog_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the 6 default categories
INSERT INTO public.blog_categories (slug, name_en, name_th, description_en, description_th, icon, display_order) VALUES
('prep', 'PrEP', 'PrEP', 'Pre-exposure prophylaxis information', 'ข้อมูลเกี่ยวกับยาป้องกันก่อนสัมผัส', '💊', 1),
('pep', 'PEP', 'PEP', 'Post-exposure prophylaxis information', 'ข้อมูลเกี่ยวกับยาป้องกันหลังสัมผัส', '🛡️', 2),
('sti', 'STI', 'โรคติดต่อทางเพศสัมพันธ์', 'Sexually transmitted infections', 'ข้อมูลเกี่ยวกับโรคติดต่อทางเพศสัมพันธ์', '🔬', 3),
('mental-health', 'Mental Health', 'สุขภาพจิต', 'Mental health and wellbeing', 'สุขภาพจิตและความเป็นอยู่ที่ดี', '🧠', 4),
('harm-reduction', 'Harm Reduction', 'การลดอันตราย', 'Harm reduction practices', 'แนวทางการลดอันตราย', '🌿', 5),
('lifestyle', 'Lifestyle', 'ไลฟ์สไตล์', 'Healthy lifestyle tips', 'เคล็ดลับการใช้ชีวิตอย่างมีสุขภาพดี', '✨', 6);

-- Create storage bucket for article images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for blog images
CREATE POLICY "Anyone can view blog images"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-images');

CREATE POLICY "Admins can upload blog images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'blog-images' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update blog images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'blog-images'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete blog images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'blog-images'
  AND public.has_role(auth.uid(), 'admin')
);