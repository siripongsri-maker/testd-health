import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/hooks/useAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle, Send, Shield, ChevronDown, ChevronUp,
  Users, RefreshCw, Clock,
} from "lucide-react";

/* ── blocked-keyword filter ── */
const BLOCKED_KEYWORDS = [
  "ขาย", "sell", "selling", "dealer", "ซื้อ", "buy", "source", "หาของ",
  "connect", "plug", "wickr", "telegram", "signal group",
];
const blocked = (t: string) => BLOCKED_KEYWORDS.some((k) => t.toLowerCase().includes(k));

/* ── anonymous token ── */
function getAnonToken(): string {
  const key = "hr_peer_token";
  let token = localStorage.getItem(key);
  if (!token) {
    token = `peer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, token);
  }
  return token;
}

/* ── types ── */
interface Post { id: string; content: string; created_at: string; anonymous_token: string; }
interface Reply { id: string; content: string; created_at: string; anonymous_token: string; }

/* ── time helper ── */
function timeAgo(dateStr: string, isEn: boolean) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return isEn ? "just now" : "เมื่อสักครู่";
  if (mins < 60) return isEn ? `${mins}m ago` : `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return isEn ? `${hours}h ago` : `${hours} ชม.ที่แล้ว`;
  const days = Math.floor(hours / 24);
  return isEn ? `${days}d ago` : `${days} วันที่แล้ว`;
}

/* ── main page ── */
export default function Community() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const myToken = getAnonToken();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  /* ── load posts ── */
  const loadPosts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("hr_peer_posts")
      .select("id, content, created_at, anonymous_token")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  /* ── realtime ── */
  useEffect(() => {
    const ch = supabase
      .channel("community-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "hr_peer_posts" }, (payload) => {
        const row = payload.new as Post;
        if (row.is_approved !== undefined && !(row as any).is_approved) return;
        setPosts((prev) => [row, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  /* ── load replies ── */
  const loadReplies = async (postId: string) => {
    const { data } = await supabase
      .from("hr_peer_replies")
      .select("id, content, created_at, anonymous_token")
      .eq("post_id", postId)
      .eq("is_approved", true)
      .order("created_at", { ascending: true });
    setReplies((prev) => ({ ...prev, [postId]: data || [] }));
  };

  /* ── submit post ── */
  const submitPost = async () => {
    if (!newPost.trim()) return;
    if (blocked(newPost)) {
      toast.error(isEn ? "This content is not allowed." : "เนื้อหานี้ไม่ได้รับอนุญาต");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("hr_peer_posts").insert({
        anonymous_token: myToken,
        content: newPost.trim(),
      });
      if (error) throw error;
      setNewPost("");
      toast.success(isEn ? "Posted! Awaiting moderator review." : "โพสต์แล้ว! รอการตรวจสอบ");
      trackEvent("community_post_created");
    } catch {
      toast.error(isEn ? "Failed to post" : "โพสต์ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── submit reply ── */
  const submitReply = async (postId: string) => {
    const text = replyText[postId]?.trim();
    if (!text) return;
    if (blocked(text)) {
      toast.error(isEn ? "This content is not allowed." : "เนื้อหานี้ไม่ได้รับอนุญาต");
      return;
    }
    try {
      const { error } = await supabase.from("hr_peer_replies").insert({
        post_id: postId,
        anonymous_token: myToken,
        content: text,
      });
      if (error) throw error;
      setReplyText((prev) => ({ ...prev, [postId]: "" }));
      toast.success(isEn ? "Reply submitted for review" : "ส่งตอบแล้ว รอการตรวจสอบ");
      trackEvent("community_reply_created");
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

  const isMe = (token: string) => token === myToken;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {isEn ? "Community" : "ชุมชน"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEn
                ? "Ask & share anonymously. All posts are moderated."
                : "ถาม-ตอบ แบบไม่ระบุตัวตน โพสต์ทั้งหมดผ่านการตรวจสอบ"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={loadPosts} className="rounded-full">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Compose */}
        <Card className="border border-primary/20 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <Textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder={isEn ? "Share a question or experience..." : "แชร์คำถามหรือประสบการณ์..."}
              className="rounded-xl min-h-[80px] resize-none"
              maxLength={500}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-normal gap-1">
                  <Shield className="h-3 w-3" />
                  {isEn ? "Anonymous" : "ไม่ระบุตัวตน"}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{newPost.length}/500</span>
              </div>
              <Button
                size="sm"
                onClick={submitPost}
                disabled={!newPost.trim() || submitting}
                className="rounded-xl gap-1"
              >
                <Send className="h-3.5 w-3.5" />
                {isEn ? "Post" : "โพสต์"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feed */}
        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {isEn ? "Loading..." : "กำลังโหลด..."}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <MessageCircle className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {isEn ? "No posts yet. Be the first!" : "ยังไม่มีโพสต์ เป็นคนแรกเลย!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id} className="border border-border/40 transition-shadow hover:shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground whitespace-pre-wrap flex-1 leading-relaxed">
                      {post.content}
                    </p>
                    {isMe(post.anonymous_token) && (
                      <Badge variant="secondary" className="text-[9px] shrink-0">
                        {isEn ? "You" : "คุณ"}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(post.created_at, isEn)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePost(post.id)}
                      className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {isEn ? "Reply" : "ตอบ"}
                      {replies[post.id]?.length ? ` (${replies[post.id].length})` : ""}
                      {expandedPost === post.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </div>

                  {/* Replies */}
                  {expandedPost === post.id && (
                    <div className="pt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200 border-t border-border/30">
                      {(replies[post.id] || []).map((reply) => (
                        <div key={reply.id} className="pl-3 border-l-2 border-primary/20 py-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-foreground leading-relaxed">{reply.content}</p>
                            {isMe(reply.anonymous_token) && (
                              <Badge variant="secondary" className="text-[8px] shrink-0">
                                {isEn ? "You" : "คุณ"}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {timeAgo(reply.created_at, isEn)}
                          </span>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <Textarea
                          value={replyText[post.id] || ""}
                          onChange={(e) => setReplyText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder={isEn ? "Write a reply..." : "เขียนตอบ..."}
                          className="rounded-xl min-h-[40px] text-xs resize-none"
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

        {/* Safety footer */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30">
          <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {isEn
              ? "All posts are anonymous and moderated. No selling, sourcing, or illegal content."
              : "โพสต์ทั้งหมดเป็นแบบไม่ระบุตัวตนและมีผู้ดูแล ไม่อนุญาตให้ขาย หาแหล่ง หรือเนื้อหาผิดกฎหมาย"}
          </p>
        </div>
      </div>
    </div>
  );
}
