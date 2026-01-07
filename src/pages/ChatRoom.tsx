import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send, Info, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  nickname: string;
  content: string;
  created_at: string;
  user_id: string | null;
}

const ANIMAL_ADJECTIVES = ['Happy', 'Brave', 'Gentle', 'Swift', 'Calm', 'Wise', 'Kind', 'Bold'];
const ANIMALS = ['Panda', 'Tiger', 'Eagle', 'Dolphin', 'Fox', 'Bear', 'Wolf', 'Owl'];

function generateNickname(): string {
  const adj = ANIMAL_ADJECTIVES[Math.floor(Math.random() * ANIMAL_ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${adj}${animal}${num}`;
}

export default function ChatRoom() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [nickname, setNickname] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const roomNames: Record<string, { en: string; th: string }> = {
    'prep-pep': { en: 'PrEP & PEP', th: 'PrEP และ PEP' },
    'testing': { en: 'Testing & Results', th: 'การตรวจและผลตรวจ' },
    'dating': { en: 'Dating & Relationships', th: 'การเดตและความสัมพันธ์' },
    'harm-reduction': { en: 'Harm Reduction', th: 'การลดอันตราย' },
  };

  useEffect(() => {
    const stored = localStorage.getItem(`chat-nickname-${slug}`);
    if (stored) {
      setNickname(stored);
    } else {
      const newNick = generateNickname();
      setNickname(newNick);
      localStorage.setItem(`chat-nickname-${slug}`, newNick);
    }
  }, [slug]);

  useEffect(() => {
    const fetchRoom = async () => {
      const { data } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (data) {
        setRoomId(data.id);
      }
    };
    fetchRoom();
  }, [slug]);

  useEffect(() => {
    if (!roomId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) {
        setMessages(data);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !roomId || !user || sending) return;

    setSending(true);
    try {
      await supabase.from('chat_messages').insert({
        room_id: roomId,
        user_id: user.id,
        nickname,
        content: newMessage.trim(),
      });
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const roomName = roomNames[slug || '']?.[language] || slug;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate('/community')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-foreground">{roomName}</h1>
          <p className="text-xs text-muted-foreground">{t('chat.yourNickname')}: {nickname}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowGuidelines(!showGuidelines)}>
          <Info className="h-5 w-5" />
        </Button>
      </div>

      {/* Guidelines */}
      {showGuidelines && (
        <Card className="m-4 p-4 bg-primary/5 border-primary/20">
          <h3 className="font-bold text-sm mb-2">{t('chat.guidelines.title')}</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• {t('chat.guidelines.respectful')}</li>
            <li>• {t('chat.guidelines.noPersonalInfo')}</li>
            <li>• {t('chat.guidelines.supportive')}</li>
            <li>• {t('chat.guidelines.notMedicalAdvice')}</li>
          </ul>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2 text-xs"
            onClick={() => setShowGuidelines(false)}
          >
            {t('common.dismiss')}
          </Button>
        </Card>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!user && (
          <Card className="p-4 text-center">
            <p className="text-muted-foreground mb-2">{t('chat.loginRequired')}</p>
            <Button onClick={() => navigate('/auth')}>
              {t('auth.login')}
            </Button>
          </Card>
        )}
        
        {messages.map((msg) => {
          const isOwn = msg.user_id === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                isOwn 
                  ? 'bg-primary text-primary-foreground rounded-br-md' 
                  : 'bg-muted text-foreground rounded-bl-md'
              }`}>
                {!isOwn && (
                  <p className="text-xs font-medium opacity-70 mb-1">{msg.nickname}</p>
                )}
                <p className="text-sm">{msg.content}</p>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-2">
                {format(new Date(msg.created_at), 'HH:mm')}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {user && (
        <div className="p-4 border-t border-border bg-card safe-bottom">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="shrink-0">
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Input
              placeholder={t('chat.typeMessage')}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              size="icon" 
              onClick={handleSend} 
              disabled={!newMessage.trim() || sending}
              className="shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
