import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { AdminBreadcrumb } from "@/components/AdminBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { 
  ArrowLeft, Plus, Pencil, Trash2, Eye, Send, Check, X, 
  FileText, Clock, CheckCircle, Archive, Loader2, Upload, Image
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type ArticleStatus = 'draft' | 'pending_review' | 'published' | 'archived';

interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_th: string;
  icon: string;
}

interface Article {
  id: string;
  slug: string;
  title_en: string;
  title_th: string;
  excerpt_en: string | null;
  excerpt_th: string | null;
  content_en: string | null;
  content_th: string | null;
  cover_url: string | null;
  category_id: string | null;
  status: ArticleStatus;
  view_count: number;
  author_name: string | null;
  published_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<ArticleStatus, { label: string; labelTh: string; icon: typeof FileText; color: string }> = {
  draft: { label: 'Draft', labelTh: 'ฉบับร่าง', icon: FileText, color: 'bg-muted text-muted-foreground' },
  pending_review: { label: 'Pending Review', labelTh: 'รอตรวจสอบ', icon: Clock, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  published: { label: 'Published', labelTh: 'เผยแพร่แล้ว', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  archived: { label: 'Archived', labelTh: 'เก็บถาวร', icon: Archive, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
};

export default function AdminBlog() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<ArticleStatus | 'all'>('all');
  
  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    title_en: '',
    title_th: '',
    excerpt_en: '',
    excerpt_th: '',
    content_en: '',
    content_th: '',
    cover_url: '',
    category_id: '',
    author_name: '',
  });

  useEffect(() => {
    checkAdminAndLoadData();
  }, [user]);

  const checkAdminAndLoadData = async () => {
    // Wait for auth to be determined - don't redirect immediately
    if (user === undefined) {
      return; // Still loading auth state
    }
    
    if (user === null) {
      navigate('/auth', { state: { from: '/admin/blog' } });
      return;
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      navigate('/');
      return;
    }

    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [articlesRes, categoriesRes] = await Promise.all([
        supabase
          .from('blog_articles')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('blog_categories')
          .select('id, slug, name_en, name_th, icon')
          .order('display_order')
      ]);

      if (articlesRes.data) setArticles(articlesRes.data as Article[]);
      if (categoriesRes.data) setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (article?: Article) => {
    if (article) {
      setEditingArticle(article);
      setForm({
        title_en: article.title_en,
        title_th: article.title_th,
        excerpt_en: article.excerpt_en || '',
        excerpt_th: article.excerpt_th || '',
        content_en: article.content_en || '',
        content_th: article.content_th || '',
        cover_url: article.cover_url || '',
        category_id: article.category_id || '',
        author_name: article.author_name || '',
      });
    } else {
      setEditingArticle(null);
      setForm({
        title_en: '',
        title_th: '',
        excerpt_en: '',
        excerpt_th: '',
        content_en: '',
        content_th: '',
        cover_url: '',
        category_id: '',
        author_name: user?.user_metadata?.display_name || '',
      });
    }
    setIsEditorOpen(true);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50) + '-' + Date.now().toString(36);
  };

  const saveArticle = async (newStatus?: ArticleStatus) => {
    if (!form.title_en || !form.title_th) {
      toast.error(language === 'th' ? 'กรุณากรอกหัวข้อ' : 'Please enter a title');
      return;
    }

    setIsSaving(true);
    try {
      const status = newStatus || (editingArticle?.status) || 'draft';
      const now = new Date().toISOString();
      
      const articleData = {
        ...form,
        category_id: form.category_id || null,
        status,
        author_id: user?.id,
        published_at: status === 'published' && !editingArticle?.published_at ? now : editingArticle?.published_at,
        reviewed_by: newStatus === 'published' ? user?.id : editingArticle?.reviewed_by,
        reviewed_at: newStatus === 'published' ? now : editingArticle?.reviewed_at,
      };

      if (editingArticle) {
        const { error } = await supabase
          .from('blog_articles')
          .update(articleData)
          .eq('id', editingArticle.id);
        
        if (error) throw error;
        toast.success(language === 'th' ? 'บันทึกบทความแล้ว' : 'Article saved');
      } else {
        const { error } = await supabase
          .from('blog_articles')
          .insert({
            ...articleData,
            slug: generateSlug(form.title_en),
          });
        
        if (error) throw error;
        toast.success(language === 'th' ? 'สร้างบทความแล้ว' : 'Article created');
      }

      setIsEditorOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm(language === 'th' ? 'ต้องการลบบทความนี้?' : 'Delete this article?')) return;
    
    try {
      const { error } = await supabase
        .from('blog_articles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success(language === 'th' ? 'ลบบทความแล้ว' : 'Article deleted');
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
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

  const filteredArticles = filterStatus === 'all' 
    ? articles 
    : articles.filter(a => a.status === filterStatus);

  const getCategoryName = (categoryId: string | null) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? `${cat.icon} ${language === 'th' ? cat.name_th : cat.name_en}` : '';
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AdminBreadcrumb currentPage="Blog Management" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            {language === 'th' ? 'จัดการบทความ' : 'Blog Management'}
          </h1>
        </div>
        <Button onClick={() => openEditor()} className="gap-2">
          <Plus className="h-4 w-4" />
          {language === 'th' ? 'เขียนบทความ' : 'New Article'}
        </Button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Button
          variant={filterStatus === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('all')}
          className="rounded-full"
        >
          {language === 'th' ? 'ทั้งหมด' : 'All'} ({articles.length})
        </Button>
        {(Object.keys(STATUS_CONFIG) as ArticleStatus[]).map((status) => {
          const config = STATUS_CONFIG[status];
          const count = articles.filter(a => a.status === status).length;
          return (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="rounded-full gap-1"
            >
              <config.icon className="h-3 w-3" />
              {language === 'th' ? config.labelTh : config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Articles List */}
      <div className="space-y-3">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {language === 'th' ? 'ไม่มีบทความ' : 'No articles'}
            </p>
          </div>
        ) : (
          filteredArticles.map((article) => {
            const statusConfig = STATUS_CONFIG[article.status];
            return (
              <div
                key={article.id}
                className="rounded-xl bg-card border border-border/50 p-4 hover:bg-muted/30 transition-all"
              >
                <div className="flex gap-4">
                  {article.cover_url ? (
                    <img 
                      src={article.cover_url} 
                      alt="" 
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground line-clamp-1">
                          {language === 'th' ? article.title_th : article.title_en}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {getCategoryName(article.category_id)}
                        </p>
                      </div>
                      <Badge className={cn("text-xs shrink-0", statusConfig.color)}>
                        {language === 'th' ? statusConfig.labelTh : statusConfig.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.view_count}
                      </span>
                      <span>{format(new Date(article.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => openEditor(article)} className="h-8 gap-1">
                        <Pencil className="h-3 w-3" />
                        {language === 'th' ? 'แก้ไข' : 'Edit'}
                      </Button>
                      {article.status === 'published' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => navigate(`/info/article/${article.slug}`)}
                          className="h-8 gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          {language === 'th' ? 'ดู' : 'View'}
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => deleteArticle(article.id)}
                        className="h-8 gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Article Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle 
                ? (language === 'th' ? 'แก้ไขบทความ' : 'Edit Article')
                : (language === 'th' ? 'เขียนบทความใหม่' : 'New Article')
              }
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
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

            {/* Category & Author */}
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Label className="mb-2 block">{language === 'th' ? 'ชื่อผู้เขียน' : 'Author Name'}</Label>
                <Input
                  value={form.author_name}
                  onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                  placeholder={language === 'th' ? 'ชื่อผู้เขียน' : 'Author name'}
                />
              </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="en" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="en" className="flex-1">English</TabsTrigger>
                <TabsTrigger value="th" className="flex-1">ไทย</TabsTrigger>
              </TabsList>
              
              <TabsContent value="en" className="space-y-4 mt-4">
                <div>
                  <Label className="mb-2 block">Title (EN)</Label>
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
                    placeholder="Article content..."
                    rows={10}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="th" className="space-y-4 mt-4">
                <div>
                  <Label className="mb-2 block">หัวข้อ (TH)</Label>
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
                    placeholder="เนื้อหาบทความ..."
                    rows={10}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </Button>
              <Button variant="outline" onClick={() => saveArticle('draft')} disabled={isSaving} className="gap-1">
                <FileText className="h-4 w-4" />
                {language === 'th' ? 'บันทึกฉบับร่าง' : 'Save Draft'}
              </Button>
              <Button variant="outline" onClick={() => saveArticle('pending_review')} disabled={isSaving} className="gap-1">
                <Send className="h-4 w-4" />
                {language === 'th' ? 'ส่งตรวจสอบ' : 'Submit for Review'}
              </Button>
              <Button onClick={() => saveArticle('published')} disabled={isSaving} className="gap-1 ml-auto">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {language === 'th' ? 'เผยแพร่' : 'Publish'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}