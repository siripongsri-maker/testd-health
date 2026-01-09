import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { ArrowLeft, Send, Upload, Loader2, X, Image, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_th: string;
  icon: string;
}

export default function WriteArticle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [form, setForm] = useState({
    title_en: '',
    title_th: '',
    excerpt_en: '',
    excerpt_th: '',
    content_en: '',
    content_th: '',
    cover_url: '',
    category_id: '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data } = await supabase
        .from('blog_categories')
        .select('id, slug, name_en, name_th, icon')
        .order('display_order');
      
      if (data) setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50) + '-' + Date.now().toString(36);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(language === 'th' ? 'กรุณาเลือกไฟล์รูปภาพ' : 'Please select an image');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      setForm({ ...form, cover_url: publicUrl });
      toast.success(language === 'th' ? 'อัพโหลดรูปแล้ว' : 'Image uploaded');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const submitArticle = async () => {
    if (!user) {
      toast.error(language === 'th' ? 'กรุณาเข้าสู่ระบบ' : 'Please login first');
      navigate('/auth');
      return;
    }

    if (!form.title_en || !form.title_th) {
      toast.error(language === 'th' ? 'กรุณากรอกหัวข้อ' : 'Please enter a title');
      return;
    }

    if (!form.content_en && !form.content_th) {
      toast.error(language === 'th' ? 'กรุณากรอกเนื้อหา' : 'Please enter content');
      return;
    }

    setIsSaving(true);
    try {
      // Get user's display name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      const authorName = profile?.display_name || user.email?.split('@')[0] || 'Anonymous';

      const { error } = await supabase
        .from('blog_articles')
        .insert({
          ...form,
          category_id: form.category_id || null,
          slug: generateSlug(form.title_en || form.title_th),
          status: 'pending_review',
          author_id: user.id,
          author_name: authorName,
        });

      if (error) throw error;

      toast.success(
        language === 'th' 
          ? 'ส่งบทความเรียบร้อยแล้ว! รอการอนุมัติจากแอดมิน' 
          : 'Article submitted! Waiting for admin approval.',
        { duration: 5000, icon: "📝" }
      );
      navigate('/info');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <>
        <PageContainer>
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {language === 'th' ? 'เข้าสู่ระบบเพื่อเขียนบทความ' : 'Login to Write Articles'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {language === 'th' 
                ? 'แชร์ความรู้และประสบการณ์กับชุมชน' 
                : 'Share your knowledge and experiences with the community'}
            </p>
            <Button onClick={() => navigate('/auth')}>
              {t('auth.login')}
            </Button>
          </div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <PageContainer>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <PageContainer className="pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/info')} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {language === 'th' ? 'เขียนบทความ' : 'Write Article'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {language === 'th' ? 'แชร์ความรู้กับชุมชน' : 'Share knowledge with the community'}
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 mb-6">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {language === 'th' ? 'รับ 100 XP เมื่อบทความได้รับการเผยแพร่!' : 'Earn 100 XP when your article is published!'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'th' 
                  ? 'บทความจะผ่านการตรวจสอบก่อนเผยแพร่' 
                  : 'Articles will be reviewed before publishing'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Cover Image */}
          <div>
            <Label className="mb-2 block">{language === 'th' ? 'ภาพปก' : 'Cover Image'}</Label>
            <div className="flex gap-4 items-start">
              {form.cover_url ? (
                <div className="relative">
                  <img src={form.cover_url} alt="" className="w-32 h-24 rounded-lg object-cover" />
                  <button
                    onClick={() => setForm({ ...form, cover_url: '' })}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-24 rounded-lg bg-muted flex items-center justify-center">
                  <Image className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {language === 'th' ? 'อัพโหลด' : 'Upload'}
                </Button>
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <Label className="mb-2 block">{language === 'th' ? 'หมวดหมู่' : 'Category'}</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'th' ? 'เลือกหมวดหมู่' : 'Select category'} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {language === 'th' ? cat.name_th : cat.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue={language === 'th' ? 'th' : 'en'} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="en" className="flex-1">English</TabsTrigger>
              <TabsTrigger value="th" className="flex-1">ไทย</TabsTrigger>
            </TabsList>
            
            <TabsContent value="en" className="space-y-4 mt-4">
              <div>
                <Label className="mb-2 block">Title (EN) *</Label>
                <Input
                  value={form.title_en}
                  onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                  placeholder="Article title"
                />
              </div>
              <div>
                <Label className="mb-2 block">Excerpt (EN)</Label>
                <Textarea
                  value={form.excerpt_en}
                  onChange={(e) => setForm({ ...form, excerpt_en: e.target.value })}
                  placeholder="Brief summary..."
                  rows={2}
                />
              </div>
              <div>
                <Label className="mb-2 block">Content (EN)</Label>
                <Textarea
                  value={form.content_en}
                  onChange={(e) => setForm({ ...form, content_en: e.target.value })}
                  placeholder="Write your article content..."
                  rows={10}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="th" className="space-y-4 mt-4">
              <div>
                <Label className="mb-2 block">หัวข้อ (TH) *</Label>
                <Input
                  value={form.title_th}
                  onChange={(e) => setForm({ ...form, title_th: e.target.value })}
                  placeholder="หัวข้อบทความ"
                />
              </div>
              <div>
                <Label className="mb-2 block">คำนำ (TH)</Label>
                <Textarea
                  value={form.excerpt_th}
                  onChange={(e) => setForm({ ...form, excerpt_th: e.target.value })}
                  placeholder="สรุปย่อ..."
                  rows={2}
                />
              </div>
              <div>
                <Label className="mb-2 block">เนื้อหา (TH)</Label>
                <Textarea
                  value={form.content_th}
                  onChange={(e) => setForm({ ...form, content_th: e.target.value })}
                  placeholder="เขียนเนื้อหาบทความ..."
                  rows={10}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <Button 
            onClick={submitArticle} 
            disabled={isSaving} 
            className="w-full gap-2"
            size="lg"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {language === 'th' ? 'ส่งบทความเพื่อตรวจสอบ' : 'Submit for Review'}
          </Button>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
