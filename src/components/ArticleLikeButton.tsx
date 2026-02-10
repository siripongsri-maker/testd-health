import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getUserData, setUserData } from "@/lib/store";

interface ArticleLikeButtonProps {
  articleId: string;
  authorId: string | null;
  initialLikeCount?: number;
  className?: string;
}

export function ArticleLikeButton({ 
  articleId, 
  authorId, 
  initialLikeCount = 0, 
  className 
}: ArticleLikeButtonProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [loading, setLoading] = useState(false);
  const [checkingLike, setCheckingLike] = useState(true);

  useEffect(() => {
    if (user) {
      checkIfLiked();
    } else {
      setCheckingLike(false);
    }
  }, [user, articleId]);

  const checkIfLiked = async () => {
    if (!user) return;
    
    try {
      // Use secure RPC function to check if user liked the article
      const { data, error } = await supabase
        .rpc('user_liked_article', { p_article_id: articleId });

      if (error) throw error;
      setLiked(!!data);
    } catch (error) {
      console.error('Error checking like:', error);
    } finally {
      setCheckingLike(false);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      toast.error(language === 'th' ? 'กรุณาเข้าสู่ระบบ' : 'Please login first');
      return;
    }

    setLoading(true);
    try {
      if (liked) {
        // Unlike
        const { error } = await supabase
          .from('article_likes')
          .delete()
          .eq('article_id', articleId)
          .eq('user_id', user.id);

        if (error) throw error;
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        // Like
        const { error } = await supabase
          .from('article_likes')
          .insert({
            article_id: articleId,
            user_id: user.id,
          });

        if (error) throw error;
        setLiked(true);
        setLikeCount((prev) => prev + 1);

        // Award XP to author if they're not the same as the liker
        if (authorId && authorId !== user.id) {
          await supabase.rpc('award_xp_to_user', {
            target_user_id: authorId,
            xp_amount: 10
          });
        }

        toast.success(language === 'th' ? '❤️ ถูกใจแล้ว!' : '❤️ Liked!', { duration: 2000 });
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLike}
      disabled={loading || checkingLike}
      className={cn(
        "gap-2 transition-all",
        liked && "text-rose-500 hover:text-rose-600",
        className
      )}
    >
      {loading || checkingLike ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={cn("h-4 w-4", liked && "fill-current")} />
      )}
      <span>{likeCount}</span>
    </Button>
  );
}
