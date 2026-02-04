import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { useQuestProgress } from "@/hooks/useQuestProgress";
import { MessageCircle, Send, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Comment {
  id: string;
  content: string;
  author_name: string | null;
  user_id: string;
  created_at: string;
}

interface ArticleCommentsProps {
  articleId: string;
}

export function ArticleComments({ articleId }: ArticleCommentsProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { trackArticleComment } = useQuestProgress();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [articleId]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('article_comments')
        .select('*')
        .eq('article_id', articleId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!user) {
      toast.error(language === 'th' ? 'กรุณาเข้าสู่ระบบ' : 'Please login first');
      return;
    }

    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      // Get user's display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      const authorName = profile?.display_name || user.email?.split('@')[0] || 'Anonymous';

      const { error } = await supabase
        .from('article_comments')
        .insert({
          article_id: articleId,
          user_id: user.id,
          content: newComment.trim(),
          author_name: authorName,
        });

      if (error) throw error;

      setNewComment("");
      loadComments();
      toast.success(language === 'th' ? 'แสดงความคิดเห็นแล้ว' : 'Comment posted');
      
      // Track quest completion
      trackArticleComment(language);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('article_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      loadComments();
      toast.success(language === 'th' ? 'ลบความคิดเห็นแล้ว' : 'Comment deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">
          {language === 'th' ? 'ความคิดเห็น' : 'Comments'} ({comments.length})
        </h3>
      </div>

      {/* Comment Input */}
      <div className="rounded-xl bg-card border border-border p-4 mb-4">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={
            user
              ? (language === 'th' ? 'เขียนความคิดเห็น...' : 'Write a comment...')
              : (language === 'th' ? 'เข้าสู่ระบบเพื่อแสดงความคิดเห็น' : 'Login to comment')
          }
          rows={3}
          disabled={!user}
          className="mb-3"
        />
        <div className="flex justify-end">
          <Button
            onClick={submitComment}
            disabled={!user || !newComment.trim() || submitting}
            size="sm"
            className="gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {language === 'th' ? 'ส่ง' : 'Send'}
          </Button>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {language === 'th' ? 'ยังไม่มีความคิดเห็น' : 'No comments yet'}
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl bg-muted/30 border border-border/50 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground text-sm">
                      {comment.author_name || 'Anonymous'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-foreground text-sm whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
                {user?.id === comment.user_id && (
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
