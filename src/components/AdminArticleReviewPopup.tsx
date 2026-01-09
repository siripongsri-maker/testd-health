import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Check, X, FileText, User, Clock, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
  author_id: string | null;
  author_name: string | null;
  status: string;
  created_at: string;
}

interface AdminArticleReviewPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewComplete: () => void;
}

export function AdminArticleReviewPopup({ 
  open, 
  onOpenChange, 
  onReviewComplete 
}: AdminArticleReviewPopupProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [feedback, setFeedback] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      loadPendingArticles();
    }
  }, [open]);

  const loadPendingArticles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error loading pending articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveArticle = async (article: Article) => {
    if (!user) return;
    
    setProcessing(true);
    try {
      const now = new Date().toISOString();
      
      // Update article status
      const { error } = await supabase
        .from('blog_articles')
        .update({
          status: 'published',
          published_at: now,
          reviewed_by: user.id,
          reviewed_at: now,
          rejection_feedback: null,
        })
        .eq('id', article.id);

      if (error) throw error;

      // Award 100 XP to the author
      if (article.author_id) {
        const { data: authorProfile } = await supabase
          .from('profiles')
          .select('xp, badges')
          .eq('id', article.author_id)
          .single();

        if (authorProfile) {
          const newXp = (authorProfile.xp || 0) + 100;
          const badges = authorProfile.badges || [];
          
          // Award writer badge if not already earned
          if (!badges.includes('writer')) {
            badges.push('writer');
          }

          await supabase
            .from('profiles')
            .update({ xp: newXp, badges })
            .eq('id', article.author_id);
        }
      }

      toast.success(
        language === 'th' 
          ? 'อนุมัติบทความแล้ว! ผู้เขียนได้รับ 100 XP' 
          : 'Article approved! Author earned 100 XP'
      );
      
      loadPendingArticles();
      setSelectedArticle(null);
      setFeedback("");
      onReviewComplete();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const rejectArticle = async (article: Article) => {
    if (!user) return;
    
    if (!feedback.trim()) {
      toast.error(language === 'th' ? 'กรุณาใส่เหตุผล' : 'Please provide feedback');
      return;
    }

    setProcessing(true);
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('blog_articles')
        .update({
          status: 'draft',
          reviewed_by: user.id,
          reviewed_at: now,
          rejection_feedback: feedback.trim(),
        })
        .eq('id', article.id);

      if (error) throw error;

      toast.success(language === 'th' ? 'ส่งความคิดเห็นกลับแล้ว' : 'Feedback sent to author');
      loadPendingArticles();
      setSelectedArticle(null);
      setFeedback("");
      onReviewComplete();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'th' ? 'บทความรอตรวจสอบ' : 'Pending Article Reviews'}
            {articles.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {articles.length}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <Check className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {language === 'th' ? 'ไม่มีบทความรอตรวจสอบ' : 'No pending articles'}
            </p>
          </div>
        ) : selectedArticle ? (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {/* Article Preview */}
              {selectedArticle.cover_url && (
                <img 
                  src={selectedArticle.cover_url} 
                  alt="" 
                  className="w-full h-40 object-cover rounded-lg"
                />
              )}
              
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {language === 'th' ? selectedArticle.title_th : selectedArticle.title_en}
                </h3>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {selectedArticle.author_name || 'Anonymous'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(selectedArticle.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 text-sm">
                <p className="font-medium mb-2">
                  {language === 'th' ? 'คำนำ:' : 'Excerpt:'}
                </p>
                <p className="text-muted-foreground">
                  {language === 'th' 
                    ? (selectedArticle.excerpt_th || 'ไม่มี') 
                    : (selectedArticle.excerpt_en || 'None')}
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 text-sm">
                <p className="font-medium mb-2">
                  {language === 'th' ? 'เนื้อหา:' : 'Content:'}
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap line-clamp-10">
                  {language === 'th' 
                    ? (selectedArticle.content_th || 'ไม่มี') 
                    : (selectedArticle.content_en || 'None')}
                </p>
              </div>

              {/* Feedback for rejection */}
              <div>
                <Label className="mb-2 block">
                  {language === 'th' ? 'ความคิดเห็น (จำเป็นสำหรับการปฏิเสธ)' : 'Feedback (required for rejection)'}
                </Label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={
                    language === 'th' 
                      ? 'เหตุผลที่ไม่อนุมัติ หรือสิ่งที่ควรปรับปรุง...' 
                      : 'Reason for rejection or improvements needed...'
                  }
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedArticle(null);
                    setFeedback("");
                  }}
                >
                  {language === 'th' ? 'กลับ' : 'Back'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => rejectArticle(selectedArticle)}
                  disabled={processing}
                  className="gap-1"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  {language === 'th' ? 'ปฏิเสธ' : 'Reject'}
                </Button>
                <Button
                  onClick={() => approveArticle(selectedArticle)}
                  disabled={processing}
                  className="gap-1 ml-auto bg-emerald-600 hover:bg-emerald-700"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {language === 'th' ? 'อนุมัติ' : 'Approve'}
                </Button>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-4">
              {articles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className="w-full text-left rounded-xl bg-card border border-border/50 p-4 hover:bg-muted/30 transition-all flex gap-4"
                >
                  {article.cover_url ? (
                    <img 
                      src={article.cover_url} 
                      alt="" 
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground line-clamp-1">
                      {language === 'th' ? article.title_th : article.title_en}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                      {language === 'th' ? article.excerpt_th : article.excerpt_en}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{article.author_name || 'Anonymous'}</span>
                      <span>{format(new Date(article.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
