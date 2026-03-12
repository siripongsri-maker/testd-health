import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/hooks/useAnalytics";
import {
  Users, Send, MessageCircle, Shield, ChevronDown, ChevronUp,
} from "lucide-react";

const BLOCKED_KEYWORDS = [
  "ขาย", "sell", "selling", "dealer", "ซื้อ", "buy", "source", "หาของ",
  "connect", "plug", "wickr", "telegram", "signal group",
];

function containsBlockedContent(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_KEYWORDS.some((kw) => lower.includes(kw));
}

function getAnonToken(): string {
  const key = "hr_peer_token";
  let token = localStorage.getItem(key);
  if (!token) {
    token = `peer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, token);
  }
  return token;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  reply_count?: number;
}

interface Reply {
  id: string;
  content: string;
  created_at: string;
}

export function PeerSupport() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("hr_peer_posts")
      .select("id, content, created_at")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(30);
    setPosts(data || []);
    setLoading(false);
  };

  const loadReplies = async (postId: string) => {
    const { data } = await supabase
      .from("hr_peer_replies")
      .select("id, content, created_at")
      .eq("post_id", postId)
      .eq("is_approved", true)
      .order("created_at", { ascending: true });
    setReplies((prev) => ({ ...prev, [postId]: data || [] }));
  };

  const submitPost = async () => {
    if (!newPost.trim()) return;
    if (containsBlockedContent(newPost)) {
      toast.error(
        isEn
          ? "This content is not allowed in the peer support space."
          : "เนื้อหานี้ไม่ได้รับอนุญาตในพื้นที่สนับสนุนเพื่อน"
      );
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("hr_peer_posts").insert({
        anonymous_token: getAnonToken(),
        content: newPost.trim(),
      });
      if (error) throw error;
      setNewPost("");
      toast.success(
        isEn
          ? "Posted! It will appear after moderator review."
          : "โพสต์แล้ว! จะปรากฏหลังผ่านการตรวจสอบ"
      );
      trackEvent("hr_peer_post_created");
    } catch (err) {
      toast.error(isEn ? "Failed to post" : "โพสต์ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const submitReply = async (postId: string) => {
    const text = replyText[postId]?.trim();
    if (!text) return;
    if (containsBlockedContent(text)) {
      toast.error(isEn ? "This content is not allowed." : "เนื้อหานี้ไม่ได้รับอนุญาต");
      return;
    }
    try {
      const { error } = await supabase.from("hr_peer_replies").insert({
        post_id: postId,
        anonymous_token: getAnonToken(),
        content: text,
      });
      if (error) throw error;
      setReplyText((prev) => ({ ...prev, [postId]: "" }));
      toast.success(isEn ? "Reply submitted for review" : "ส่งตอบแล้ว รอการตรวจสอบ");
    } catch {
      toast.error(isEn ? "Failed to reply" : "ตอบไม่สำเร็จ");
    }
  };

  const togglePost = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      if (!replies[postId]) loadReplies(postId);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return isEn ? "just now" : "เมื่อสักครู่";
    if (hours < 24) return isEn ? `${hours}h ago` : `${hours} ชม.ที่แล้ว`;
    const days = Math.floor(hours / 24);
    return isEn ? `${days}d ago` : `${days} วันที่แล้ว`;
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {isEn ? "Peer Support" : "สนับสนุนกันและกัน"}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {isEn
            ? "Share anonymously. All posts are moderated for safety."
            : "แชร์โดยไม่ระบุตัวตน โพสต์ทั้งหมดผ่านการตรวจสอบเพื่อความปลอดภัย"}
        </p>
      </div>

      {/* New post */}
      <Card className="border border-border/40">
        <CardContent className="p-4 space-y-3">
          <Textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder={
              isEn
                ? "Share a question or experience (anonymous)..."
                : "แชร์คำถามหรือประสบการณ์ (ไม่ระบุตัวตน)..."
            }
            className="rounded-xl min-h-[60px]"
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{newPost.length}/500</span>
            <Button
              size="sm"
              onClick={submitPost}
              disabled={!newPost.trim() || submitting}
              className="rounded-xl"
            >
              <Send className="h-3 w-3 mr-1" />
              {isEn ? "Post" : "โพสต์"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Posts list */}
      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          {isEn ? "Loading..." : "กำลังโหลด..."}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          {isEn ? "No posts yet. Be the first to share!" : "ยังไม่มีโพสต์ เป็นคนแรกที่แชร์!"}
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Card key={post.id} className="border border-border/30">
              <CardContent className="p-3 space-y-2">
                <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePost(post.id)}
                    className="text-xs h-7 gap-1"
                  >
                    <MessageCircle className="h-3 w-3" />
                    {isEn ? "Reply" : "ตอบ"}
                    {expandedPost === post.id ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                </div>

                {expandedPost === post.id && (
                  <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    {(replies[post.id] || []).map((reply) => (
                      <div
                        key={reply.id}
                        className="pl-3 border-l-2 border-primary/20 text-sm text-muted-foreground"
                      >
                        <p className="text-foreground text-xs">{reply.content}</p>
                        <span className="text-[10px]">{timeAgo(reply.created_at)}</span>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Textarea
                        value={replyText[post.id] || ""}
                        onChange={(e) =>
                          setReplyText((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        placeholder={isEn ? "Write a reply..." : "เขียนตอบ..."}
                        className="rounded-xl min-h-[40px] text-xs"
                        maxLength={300}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => submitReply(post.id)}
                        disabled={!replyText[post.id]?.trim()}
                        className="rounded-xl self-end"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Safety notice */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30">
        <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {isEn
            ? "All posts are anonymous and moderated. No drug selling, sourcing, or illegal content allowed."
            : "โพสต์ทั้งหมดเป็นแบบไม่ระบุตัวตนและมีผู้ดูแล ไม่อนุญาตให้ขาย หาแหล่ง หรือเนื้อหาผิดกฎหมาย"}
        </p>
      </div>
    </div>
  );
}
