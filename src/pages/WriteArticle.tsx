import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { ArrowLeft, Send, Upload, Loader2, X, Image, Sparkles, FileText, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Languages, Edit3, RefreshCw, Eye, User, Calendar, BookOpen, ImagePlus, Images } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ImageGalleryPicker } from "@/components/ImageGalleryPicker";

interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_th: string;
  icon: string;
}

interface MyArticle {
  id: string;
  title_en: string;
  title_th: string;
  status: 'draft' | 'pending_review' | 'published' | 'archived';
  rejection_feedback: string | null;
  created_at: string;
  published_at: string | null;
}

export default function WriteArticle() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingContentImage, setUploadingContentImage] = useState(false);
  const [activeContentTab, setActiveContentTab] = useState<'th' | 'en'>('th');
  const contentThRef = useRef<HTMLTextAreaElement>(null);
  const contentEnRef = useRef<HTMLTextAreaElement>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [myArticles, setMyArticles] = useState<MyArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showMyArticles, setShowMyArticles] = useState(true);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
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
          .select('id, title_en, title_th, status, rejection_feedback, created_at, published_at')
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
              title_en: articleToEdit.title_en || '',
              title_th: articleToEdit.title_th || '',
              excerpt_en: articleToEdit.excerpt_en || '',
              excerpt_th: articleToEdit.excerpt_th || '',
              content_en: articleToEdit.content_en || '',
              content_th: articleToEdit.content_th || '',
              cover_url: articleToEdit.cover_url || '',
              category_id: articleToEdit.category_id || '',
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

  const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(language === 'th' ? 'กรุณาเลือกไฟล์รูปภาพ' : 'Please select an image');
      return;
    }

    setUploadingContentImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `content/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(fileName);

      // Insert markdown image at cursor position or end
      const imageMarkdown = `\n![${language === 'th' ? 'รูปภาพ' : 'Image'}](${publicUrl})\n`;
      
      if (activeContentTab === 'th') {
        const textarea = contentThRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newContent = form.content_th.substring(0, start) + imageMarkdown + form.content_th.substring(end);
          setForm({ ...form, content_th: newContent });
        } else {
          setForm({ ...form, content_th: form.content_th + imageMarkdown });
        }
      } else {
        const textarea = contentEnRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newContent = form.content_en.substring(0, start) + imageMarkdown + form.content_en.substring(end);
          setForm({ ...form, content_en: newContent });
        } else {
          setForm({ ...form, content_en: form.content_en + imageMarkdown });
        }
      }

      toast.success(language === 'th' ? 'เพิ่มรูปภาพในเนื้อหาแล้ว' : 'Image added to content');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploadingContentImage(false);
      // Reset file input
      if (contentImageInputRef.current) {
        contentImageInputRef.current.value = '';
      }
    }
  };

  const translateToEnglish = async () => {
    if (!form.title_th && !form.content_th) {
      toast.error(language === 'th' ? 'กรุณากรอกเนื้อหาภาษาไทยก่อน' : 'Please enter Thai content first');
      return;
    }

    setIsTranslating(true);
    try {
      const response = await supabase.functions.invoke('translate-article', {
        body: {
          title_th: form.title_th,
          excerpt_th: form.excerpt_th,
          content_th: form.content_th,
        }
      });

      if (response.error) throw response.error;

      const translated = response.data;
      setForm(prev => ({
        ...prev,
        title_en: translated.title_en || prev.title_en,
        excerpt_en: translated.excerpt_en || prev.excerpt_en,
        content_en: translated.content_en || prev.content_en,
      }));

      toast.success(
        language === 'th' ? 'แปลเป็นภาษาอังกฤษเรียบร้อย!' : 'Translated to English!',
        { icon: '🌐' }
      );
    } catch (error: any) {
      console.error('Translation error:', error);
      toast.error(language === 'th' ? 'ไม่สามารถแปลได้ กรุณาลองใหม่' : 'Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const submitArticle = async () => {
    if (!user) {
      toast.error(language === 'th' ? 'กรุณาเข้าสู่ระบบ' : 'Please login first');
      navigate('/auth');
      return;
    }

    if (!form.title_th) {
      toast.error(language === 'th' ? 'กรุณากรอกหัวข้อภาษาไทย' : 'Please enter Thai title');
      return;
    }

    if (!form.content_th) {
      toast.error(language === 'th' ? 'กรุณากรอกเนื้อหาภาษาไทย' : 'Please enter Thai content');
      return;
    }

    // Auto-translate if English content is missing
    let finalForm = { ...form };
    if (!form.title_en || !form.content_en) {
      setIsTranslating(true);
      try {
        const response = await supabase.functions.invoke('translate-article', {
          body: {
            title_th: form.title_th,
            excerpt_th: form.excerpt_th,
            content_th: form.content_th,
          }
        });

        if (!response.error && response.data) {
          finalForm = {
            ...finalForm,
            title_en: response.data.title_en || form.title_th,
            excerpt_en: response.data.excerpt_en || form.excerpt_th,
            content_en: response.data.content_en || form.content_th,
          };
        }
      } catch (error) {
        console.error('Auto-translation failed:', error);
        // Use Thai content as fallback
        finalForm = {
          ...finalForm,
          title_en: form.title_en || form.title_th,
          excerpt_en: form.excerpt_en || form.excerpt_th,
          content_en: form.content_en || form.content_th,
        };
      } finally {
        setIsTranslating(false);
      }
    }

    setIsSaving(true);
    try {
      if (isEditMode && editingArticleId) {
        // Update existing article and change status to pending_review
        const { error } = await supabase
          .from('blog_articles')
          .update({
            ...finalForm,
            category_id: finalForm.category_id || null,
            status: 'pending_review',
            rejection_feedback: null, // Clear previous feedback
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingArticleId)
          .eq('author_id', user.id);

        if (error) throw error;

        toast.success(
          language === 'th' 
            ? 'อัพเดทบทความแล้ว! รอการอนุมัติอีกครั้ง' 
            : 'Article updated! Waiting for re-approval.',
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
            ...finalForm,
            category_id: finalForm.category_id || null,
            slug: generateSlug(finalForm.title_en || finalForm.title_th),
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
      toast.error(error.message);
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
      title_en: '',
      title_th: '',
      excerpt_en: '',
      excerpt_th: '',
      content_en: '',
      content_th: '',
      cover_url: '',
      category_id: '',
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

  // Helper to get selected category info
  const selectedCategory = categories.find(c => c.id === form.category_id);

  // Render article content for preview
  const renderContent = (content: string | null) => {
    if (!content) {
      return (
        <p className="text-muted-foreground italic">
          {language === 'th' ? 'ไม่มีเนื้อหา' : 'No content available'}
        </p>
      );
    }

    return content.split("\n\n").map((paragraph, index) => {
      // Handle bullet points
      if (paragraph.includes("\n•") || paragraph.startsWith("•")) {
        const lines = paragraph.split("\n");
        return (
          <div key={index} className="my-4">
            {lines.map((line, i) => {
              if (line.startsWith("•")) {
                return (
                  <div key={i} className="flex items-start gap-2 text-foreground my-1">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{line.replace("• ", "")}</span>
                  </div>
                );
              }
              return <p key={i} className="font-semibold text-foreground mb-2">{line}</p>;
            })}
          </div>
        );
      }
      
      // Handle headings (lines ending with :)
      if (paragraph.endsWith(":") || paragraph.match(/^[A-Z].*:$/m)) {
        return (
          <h3 key={index} className="text-lg font-bold text-foreground mt-6 mb-3">
            {paragraph}
          </h3>
        );
      }

      // Handle markdown images ![alt](url)
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      if (imageRegex.test(paragraph)) {
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;
        const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        
        while ((match = regex.exec(paragraph)) !== null) {
          // Add text before image
          if (match.index > lastIndex) {
            parts.push(
              <span key={`text-${lastIndex}`}>
                {paragraph.substring(lastIndex, match.index)}
              </span>
            );
          }
          // Add image
          parts.push(
            <img 
              key={`img-${match.index}`}
              src={match[2]} 
              alt={match[1]} 
              className="rounded-lg max-w-full my-4"
            />
          );
          lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text
        if (lastIndex < paragraph.length) {
          parts.push(
            <span key={`text-${lastIndex}`}>
              {paragraph.substring(lastIndex)}
            </span>
          );
        }
        
        return <div key={index} className="my-2">{parts}</div>;
      }

      return (
        <p key={index} className="text-foreground leading-relaxed mb-4">
          {paragraph}
        </p>
      );
    });
  };

  return (
    <>
      <PageContainer className="pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => showPreview ? setShowPreview(false) : (isEditMode ? cancelEditing() : navigate('/info'))} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {showPreview 
                  ? (language === 'th' ? 'ตัวอย่างบทความ' : 'Article Preview')
                  : isEditMode 
                    ? (language === 'th' ? 'แก้ไขบทความ' : 'Edit Article')
                    : (language === 'th' ? 'เขียนบทความ' : 'Write Article')
                }
              </h1>
              <p className="text-sm text-muted-foreground">
                {showPreview
                  ? (language === 'th' ? 'ดูตัวอย่างก่อนส่ง' : 'Preview before submitting')
                  : isEditMode
                    ? (language === 'th' ? 'แก้ไขและส่งใหม่เพื่อตรวจสอบ' : 'Edit and resubmit for review')
                    : (language === 'th' ? 'แชร์ความรู้กับชุมชน' : 'Share knowledge with the community')
                }
              </p>
            </div>
          </div>
          {/* Preview Toggle Button */}
          {!showPreview && (form.title_th || form.content_th) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {language === 'th' ? 'ดูตัวอย่าง' : 'Preview'}
            </Button>
          )}
        </div>

        {/* Preview Mode */}
        {showPreview ? (
          <div className="space-y-6">
            {/* Category Badge */}
            {selectedCategory && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium w-fit">
                <span>{selectedCategory.icon}</span>
                <span>{language === 'th' ? selectedCategory.name_th : selectedCategory.name_en}</span>
              </div>
            )}

            {/* Cover Image Preview */}
            {form.cover_url && (
              <div className="-mx-4 sm:mx-0">
                <img
                  src={form.cover_url}
                  alt={form.title_th || form.title_en}
                  className="w-full h-48 sm:h-64 object-cover sm:rounded-2xl"
                />
              </div>
            )}

            {/* Title */}
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {language === 'th' ? (form.title_th || form.title_en) : (form.title_en || form.title_th)}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{user?.email?.split('@')[0] || 'Author'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>0 {language === 'th' ? 'ครั้ง' : 'views'}</span>
              </div>
            </div>

            {/* Content Preview */}
            <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {renderContent(language === 'th' ? (form.content_th || form.content_en) : (form.content_en || form.content_th))}
              </div>
            </div>

            {/* Preview Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                className="flex-1 gap-2"
              >
                <Edit3 className="h-4 w-4" />
                {language === 'th' ? 'กลับไปแก้ไข' : 'Back to Edit'}
              </Button>
              <Button
                onClick={submitArticle}
                disabled={isSaving || isTranslating}
                className="flex-1 gap-2"
              >
                {(isSaving || isTranslating) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {language === 'th' ? 'ส่งบทความ' : 'Submit Article'}
              </Button>
            </div>
          </div>
        ) : (
          <>
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
                      ? 'เขียนภาษาไทยแล้วกดแปลเป็นภาษาอังกฤษอัตโนมัติได้' 
                      : 'Write in Thai and auto-translate to English'}
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
                              {language === 'th' ? article.title_th : article.title_en}
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
                          {/* Edit button for rejected/draft articles */}
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

                        {/* Rejection Feedback Toggle */}
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

                      {/* Expanded Feedback */}
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

          {/* Hidden content image input */}
          <input
            ref={contentImageInputRef}
            type="file"
            accept="image/*"
            onChange={handleContentImageUpload}
            className="hidden"
          />

          {/* Content Tabs */}
          <Tabs defaultValue="th" className="w-full" onValueChange={(v) => setActiveContentTab(v as 'th' | 'en')}>
            <TabsList className="w-full">
              <TabsTrigger value="th" className="flex-1">🇹🇭 ไทย</TabsTrigger>
              <TabsTrigger value="en" className="flex-1">🇬🇧 English</TabsTrigger>
            </TabsList>
            
            <TabsContent value="th" className="space-y-4 mt-4">
              <div>
                <Label className="mb-2 block">หัวข้อ *</Label>
                <Input
                  value={form.title_th}
                  onChange={(e) => setForm({ ...form, title_th: e.target.value })}
                  placeholder="หัวข้อบทความ"
                />
              </div>
              <div>
                <Label className="mb-2 block">คำนำ</Label>
                <Textarea
                  value={form.excerpt_th}
                  onChange={(e) => setForm({ ...form, excerpt_th: e.target.value })}
                  placeholder="สรุปย่อ..."
                  rows={2}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>เนื้อหา *</Label>
                  <div className="flex gap-2">
                    <ImageGalleryPicker
                      language={language}
                      onSelect={(url) => {
                        const imageMarkdown = `\n![รูปภาพ](${url})\n`;
                        const textarea = contentThRef.current;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const newContent = form.content_th.substring(0, start) + imageMarkdown + form.content_th.substring(end);
                          setForm({ ...form, content_th: newContent });
                        } else {
                          setForm({ ...form, content_th: form.content_th + imageMarkdown });
                        }
                        toast.success('เพิ่มรูปภาพในเนื้อหาแล้ว');
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => contentImageInputRef.current?.click()}
                      disabled={uploadingContentImage}
                      className="gap-1.5 h-8"
                    >
                      {uploadingContentImage ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImagePlus className="h-3.5 w-3.5" />
                      )}
                      {language === 'th' ? 'อัพโหลดใหม่' : 'Upload New'}
                    </Button>
                  </div>
                </div>
                <Textarea
                  ref={contentThRef}
                  value={form.content_th}
                  onChange={(e) => setForm({ ...form, content_th: e.target.value })}
                  placeholder="เขียนเนื้อหาบทความ... (ใช้ ![alt](url) เพื่อเพิ่มรูปภาพ)"
                  rows={10}
                />
              </div>
              
              {/* Translate Button */}
              <Button
                type="button"
                variant="outline"
                onClick={translateToEnglish}
                disabled={isTranslating || (!form.title_th && !form.content_th)}
                className="w-full gap-2"
              >
                {isTranslating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Languages className="h-4 w-4" />
                )}
                {isTranslating 
                  ? (language === 'th' ? 'กำลังแปล...' : 'Translating...')
                  : (language === 'th' ? 'แปลเป็นภาษาอังกฤษอัตโนมัติ' : 'Auto-translate to English')
                }
              </Button>
            </TabsContent>
            
            <TabsContent value="en" className="space-y-4 mt-4">
              <div className="rounded-lg bg-muted/50 p-3 mb-4">
                <p className="text-sm text-muted-foreground">
                  {language === 'th' 
                    ? '💡 เนื้อหาภาษาอังกฤษจะถูกแปลจากภาษาไทยอัตโนมัติเมื่อส่งบทความ หรือกดปุ่มแปลในแท็บภาษาไทย'
                    : '💡 English content will be auto-translated from Thai when submitting, or press the translate button in the Thai tab'}
                </p>
              </div>
              <div>
                <Label className="mb-2 block">Title</Label>
                <Input
                  value={form.title_en}
                  onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                  placeholder="Article title (auto-translated)"
                />
              </div>
              <div>
                <Label className="mb-2 block">Excerpt</Label>
                <Textarea
                  value={form.excerpt_en}
                  onChange={(e) => setForm({ ...form, excerpt_en: e.target.value })}
                  placeholder="Brief summary (auto-translated)..."
                  rows={2}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Content</Label>
                  <div className="flex gap-2">
                    <ImageGalleryPicker
                      language={language}
                      onSelect={(url) => {
                        const imageMarkdown = `\n![Image](${url})\n`;
                        const textarea = contentEnRef.current;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const newContent = form.content_en.substring(0, start) + imageMarkdown + form.content_en.substring(end);
                          setForm({ ...form, content_en: newContent });
                        } else {
                          setForm({ ...form, content_en: form.content_en + imageMarkdown });
                        }
                        toast.success('Image added to content');
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => contentImageInputRef.current?.click()}
                      disabled={uploadingContentImage}
                      className="gap-1.5 h-8"
                    >
                      {uploadingContentImage ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImagePlus className="h-3.5 w-3.5" />
                      )}
                      Upload New
                    </Button>
                  </div>
                </div>
                <Textarea
                  ref={contentEnRef}
                  value={form.content_en}
                  onChange={(e) => setForm({ ...form, content_en: e.target.value })}
                  placeholder="Article content (auto-translated)... Use ![alt](url) to add images"
                  rows={10}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <Button 
            onClick={submitArticle} 
            disabled={isSaving || isTranslating} 
            className="w-full gap-2"
            size="lg"
          >
            {(isSaving || isTranslating) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEditMode ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {(isSaving || isTranslating)
              ? (isTranslating 
                  ? (language === 'th' ? 'กำลังแปล...' : 'Translating...') 
                  : (language === 'th' ? 'กำลังส่ง...' : 'Submitting...'))
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
          </>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}