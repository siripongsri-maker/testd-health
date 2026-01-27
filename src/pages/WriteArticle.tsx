import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { ArrowLeft, Send, Upload, Loader2, X, Image, Sparkles, FileText, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Edit3, RefreshCw, Images, Youtube } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ImageGalleryPicker } from "@/components/ImageGalleryPicker";

// Helper to extract YouTube video ID from various URL formats
const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_th: string;
  icon: string;
}

interface MyArticle {
  id: string;
  title_th: string;
  status: 'draft' | 'pending_review' | 'published' | 'archived';
  rejection_feedback: string | null;
  created_at: string;
}

export default function WriteArticle() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [myArticles, setMyArticles] = useState<MyArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showMyArticles, setShowMyArticles] = useState(true);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    title_th: '',
    excerpt_th: '',
    content_th: '',
    cover_url: '',
    category_id: '',
    video_url: '',
  });

  useEffect(() => {
    loadData();
  }, [user, editId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load categories
      const { data: catData } = await supabase
        .from('blog_categories')
        .select('id, slug, name_en, name_th, icon')
        .order('display_order');
      
      if (catData) setCategories(catData);

      // Load user's articles if logged in
      if (user) {
        const { data: articlesData } = await supabase
          .from('blog_articles')
          .select('id, title_th, status, rejection_feedback, created_at')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false });
        
        if (articlesData) setMyArticles(articlesData as MyArticle[]);

        // Load article for editing if edit param is present
        if (editId) {
          const { data: articleToEdit } = await supabase
            .from('blog_articles')
            .select('*')
            .eq('id', editId)
            .eq('author_id', user.id)
            .single();

          if (articleToEdit) {
            setForm({
              title_th: articleToEdit.title_th || '',
              excerpt_th: articleToEdit.excerpt_th || '',
              content_th: articleToEdit.content_th || '',
              cover_url: articleToEdit.cover_url || '',
              category_id: articleToEdit.category_id || '',
              video_url: (articleToEdit as any).video_url || '',
            });
            setIsEditMode(true);
            setEditingArticleId(editId);
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending_review':
        return { 
          icon: Clock, 
          color: 'text-amber-500', 
          bg: 'bg-amber-500/10',
          label: language === 'th' ? 'รอตรวจสอบ' : 'Pending Review',
          canEdit: false
        };
      case 'published':
        return { 
          icon: CheckCircle, 
          color: 'text-emerald-500', 
          bg: 'bg-emerald-500/10',
          label: language === 'th' ? 'เผยแพร่แล้ว' : 'Published',
          canEdit: false
        };
      case 'archived':
        return { 
          icon: XCircle, 
          color: 'text-destructive', 
          bg: 'bg-destructive/10',
          label: language === 'th' ? 'ถูกปฏิเสธ' : 'Rejected',
          canEdit: true
        };
      default:
        return { 
          icon: FileText, 
          color: 'text-muted-foreground', 
          bg: 'bg-muted',
          label: language === 'th' ? 'แบบร่าง' : 'Draft',
          canEdit: true
        };
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, '-')
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

    if (!form.title_th.trim()) {
      toast.error(language === 'th' ? 'กรุณากรอกหัวข้อ' : 'Please enter a title');
      return;
    }

    if (!form.content_th.trim()) {
      toast.error(language === 'th' ? 'กรุณากรอกเนื้อหา' : 'Please enter content');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode && editingArticleId) {
        // Update existing article and change status to pending_review
        const { error } = await supabase
          .from('blog_articles')
          .update({
            title_th: form.title_th,
            title_en: form.title_th, // Use Thai as placeholder, admin will translate
            excerpt_th: form.excerpt_th,
            excerpt_en: form.excerpt_th,
            content_th: form.content_th,
            content_en: form.content_th,
            cover_url: form.cover_url || null,
            category_id: form.category_id || null,
            video_url: form.video_url || null,
            status: 'pending_review',
            rejection_feedback: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingArticleId)
          .eq('author_id', user.id);

        if (error) throw error;

        toast.success(
          language === 'th' 
            ? 'อัพเดทบทความแล้ว! รอการอนุมัติจากแอดมิน' 
            : 'Article updated! Waiting for admin approval.',
          { duration: 5000, icon: "✏️" }
        );
      } else {
        // Create new article
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();

        const authorName = profile?.display_name || user.email?.split('@')[0] || 'Anonymous';

        const { error } = await supabase
          .from('blog_articles')
          .insert({
            title_th: form.title_th,
            title_en: form.title_th, // Use Thai as placeholder
            excerpt_th: form.excerpt_th,
            excerpt_en: form.excerpt_th,
            content_th: form.content_th,
            content_en: form.content_th,
            cover_url: form.cover_url || null,
            category_id: form.category_id || null,
            video_url: form.video_url || null,
            slug: generateSlug(form.title_th),
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
      }
      
      navigate('/info');
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || (language === 'th' ? 'เกิดข้อผิดพลาด' : 'An error occurred'));
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (articleId: string) => {
    navigate(`/info/write?edit=${articleId}`);
  };

  const cancelEditing = () => {
    setIsEditMode(false);
    setEditingArticleId(null);
    setForm({
      title_th: '',
      excerpt_th: '',
      content_th: '',
      cover_url: '',
      category_id: '',
      video_url: '',
    });
    navigate('/info/write');
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
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => isEditMode ? cancelEditing() : navigate('/info')} 
            className="rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {isEditMode 
                ? (language === 'th' ? 'แก้ไขบทความ' : 'Edit Article')
                : (language === 'th' ? 'เขียนบทความ' : 'Write Article')
              }
            </h1>
            <p className="text-sm text-muted-foreground">
              {language === 'th' ? 'เขียนเป็นภาษาไทย แอดมินจะตรวจสอบและแปล' : 'Write in Thai, admin will review and translate'}
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
                  ? 'เขียนภาษาไทยอย่างเดียว แอดมินจะช่วยแปลเป็นภาษาอังกฤษให้' 
                  : 'Just write in Thai, admin will translate to English for you'}
              </p>
            </div>
          </div>
        </div>

        {/* My Articles Section - Hide when in edit mode */}
        {!isEditMode && myArticles.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowMyArticles(!showMyArticles)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {language === 'th' ? 'บทความของฉัน' : 'My Articles'} ({myArticles.length})
                </span>
              </div>
              {showMyArticles ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showMyArticles && (
              <div className="mt-3 space-y-2">
                {myArticles.map((article) => {
                  const statusInfo = getStatusInfo(article.status);
                  const StatusIcon = statusInfo.icon;
                  const hasRejectionFeedback = article.status === 'archived' && article.rejection_feedback;
                  const isExpanded = expandedFeedback === article.id;

                  return (
                    <div 
                      key={article.id}
                      className="rounded-xl border border-border/50 bg-card overflow-hidden"
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2 rounded-lg flex-shrink-0", statusInfo.bg)}>
                            <StatusIcon className={cn("h-4 w-4", statusInfo.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground text-sm line-clamp-1">
                              {article.title_th}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn("text-xs font-medium", statusInfo.color)}>
                                {statusInfo.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                • {format(new Date(article.created_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                          {statusInfo.canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditing(article.id)}
                              className="gap-1 flex-shrink-0"
                            >
                              <Edit3 className="h-3 w-3" />
                              {language === 'th' ? 'แก้ไข' : 'Edit'}
                            </Button>
                          )}
                        </div>

                        {hasRejectionFeedback && (
                          <button
                            onClick={() => setExpandedFeedback(isExpanded ? null : article.id)}
                            className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm hover:bg-destructive/20 transition-colors"
                          >
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="flex-1 text-left font-medium">
                              {language === 'th' ? 'ดูเหตุผลที่ถูกปฏิเสธ' : 'View rejection reason'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>

                      {hasRejectionFeedback && isExpanded && (
                        <div className="px-4 pb-4">
                          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                            <p className="text-sm text-foreground font-medium mb-1">
                              {language === 'th' ? 'เหตุผลจากผู้ดูแล:' : 'Admin feedback:'}
                            </p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {article.rejection_feedback}
                            </p>
                          </div>
                          <Button
                            onClick={() => startEditing(article.id)}
                            className="w-full mt-3 gap-2"
                            variant="default"
                          >
                            <RefreshCw className="h-4 w-4" />
                            {language === 'th' ? 'แก้ไขและส่งใหม่' : 'Edit & Resubmit'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Article Form */}
        <div className="space-y-5">
          {/* Cover Image */}
          <div>
            <Label className="mb-2 block">{language === 'th' ? 'ภาพปก (ไม่บังคับ)' : 'Cover Image (optional)'}</Label>
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
              <div className="flex flex-col gap-2">
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
                <ImageGalleryPicker
                  language={language}
                  onSelect={(url) => setForm({ ...form, cover_url: url })}
                  trigger={
                    <Button type="button" variant="outline" className="gap-2">
                      <Images className="h-4 w-4" />
                      {language === 'th' ? 'เลือกจากคลัง' : 'Gallery'}
                    </Button>
                  }
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <Label className="mb-2 block">{language === 'th' ? 'หมวดหมู่ (ไม่บังคับ)' : 'Category (optional)'}</Label>
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

          {/* Title */}
          <div>
            <Label className="mb-2 block">{language === 'th' ? 'หัวข้อ *' : 'Title *'}</Label>
            <Input
              value={form.title_th}
              onChange={(e) => setForm({ ...form, title_th: e.target.value })}
              placeholder={language === 'th' ? 'หัวข้อบทความ' : 'Article title'}
              maxLength={200}
            />
          </div>

          {/* Excerpt */}
          <div>
            <Label className="mb-2 block">{language === 'th' ? 'คำนำ (ไม่บังคับ)' : 'Excerpt (optional)'}</Label>
            <Textarea
              value={form.excerpt_th}
              onChange={(e) => setForm({ ...form, excerpt_th: e.target.value })}
              placeholder={language === 'th' ? 'สรุปย่อ...' : 'Brief summary...'}
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Content */}
          <div>
            <Label className="mb-2 block">{language === 'th' ? 'เนื้อหา *' : 'Content *'}</Label>
            <RichTextEditor
              value={form.content_th}
              onChange={(content) => setForm({ ...form, content_th: content })}
              placeholder={language === 'th' ? 'เขียนเนื้อหาบทความ...' : 'Write your article content...'}
              rows={10}
              language={language as 'en' | 'th'}
            />
          </div>

          {/* YouTube Video URL */}
          <div>
            <Label className="mb-2 block">
              <div className="flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-500" />
                {language === 'th' ? 'ลิงก์วิดีโอ YouTube (ไม่บังคับ)' : 'YouTube Video URL (optional)'}
              </div>
            </Label>
            <Input
              value={form.video_url}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              placeholder={language === 'th' ? 'วาง URL ของ YouTube เช่น https://youtube.com/watch?v=...' : 'Paste YouTube URL e.g. https://youtube.com/watch?v=...'}
            />
            {form.video_url && !extractYouTubeVideoId(form.video_url) && (
              <p className="text-xs text-destructive mt-1">
                {language === 'th' ? 'ลิงก์ YouTube ไม่ถูกต้อง' : 'Invalid YouTube URL'}
              </p>
            )}
            {form.video_url && extractYouTubeVideoId(form.video_url) && (
              <p className="text-xs text-muted-foreground mt-1">
                ✓ {language === 'th' ? 'วิดีโอจะแสดงที่ด้านล่างของบทความ' : 'Video will appear at the bottom of the article'}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button 
            onClick={submitArticle} 
            disabled={isSaving || !form.title_th.trim() || !form.content_th.trim()} 
            className="w-full gap-2"
            size="lg"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEditMode ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSaving
              ? (language === 'th' ? 'กำลังส่ง...' : 'Submitting...')
              : isEditMode
                ? (language === 'th' ? 'ส่งบทความที่แก้ไขแล้ว' : 'Submit Edited Article')
                : (language === 'th' ? 'ส่งบทความเพื่อตรวจสอบ' : 'Submit for Review')
            }
          </Button>

          {isEditMode && (
            <Button 
              onClick={cancelEditing}
              variant="outline"
              className="w-full"
            >
              {language === 'th' ? 'ยกเลิกการแก้ไข' : 'Cancel Editing'}
            </Button>
          )}
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
