import { useState, useCallback, useRef } from 'react';
import { Mic, MicOff, X, Send, Volume2, Loader2, Bot, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/i18n';
import { useTTS } from '@/hooks/useTTS';
import { cn } from '@/lib/utils';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-voice-chat`;

type Message = { role: 'user' | 'assistant'; content: string };

export function VoiceHealthAgent() {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const { speak, stop, isPlaying, isLoading: ttsLoading } = useTTS();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const streamChat = useCallback(async (allMessages: Message[]) => {
    setIsStreaming(true);
    let assistantContent = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) throw new Error('Stream failed');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
              scrollToBottom();
            }
          } catch { /* partial JSON */ }
        }
      }

      // Auto-speak the response
      if (autoSpeak && assistantContent) {
        speak(assistantContent, language);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: language === 'th' ? 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่' : 'Sorry, an error occurred. Please try again.' 
      }]);
    } finally {
      setIsStreaming(false);
    }
  }, [autoSpeak, language, speak]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    scrollToBottom();

    await streamChat(updated);
  }, [input, isStreaming, messages, streamChat]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const greeting = language === 'th' 
    ? 'สวัสดีค่ะ! ฉันคือ Health Buddy 🩺 ถามเรื่องสุขภาพได้เลยนะ' 
    : "Hi! I'm Health Buddy 🩺 Ask me anything about sexual health!";

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            if (messages.length === 0) {
              setMessages([{ role: 'assistant', content: greeting }]);
            }
          }}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent shadow-xl shadow-primary/30 flex items-center justify-center text-primary-foreground hover:scale-110 transition-transform animate-fade-in"
          aria-label="Health Voice Agent"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-2 left-2 sm:left-auto sm:right-4 sm:w-[380px] z-50 bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[70vh] animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Health Buddy</p>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? 'ผู้ช่วยด้านสุขภาพ' : 'Health Assistant'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setAutoSpeak(!autoSpeak)}
                title={autoSpeak ? 'Mute auto-speak' : 'Enable auto-speak'}
              >
                {autoSpeak ? <Volume2 className="h-4 w-4 text-primary" /> : <MicOff className="h-4 w-4 text-muted-foreground" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                )}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === 'assistant' && !isStreaming && (
                    <button
                      onClick={() => isPlaying ? stop() : speak(msg.content, language)}
                      className="mt-1 text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                      disabled={ttsLoading}
                    >
                      {ttsLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isPlaying ? (
                        <><Volume2 className="h-3 w-3" /> {language === 'th' ? 'หยุด' : 'Stop'}</>
                      ) : (
                        <><Volume2 className="h-3 w-3" /> {language === 'th' ? 'ฟัง' : 'Listen'}</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={language === 'th' ? 'พิมพ์คำถามที่นี่...' : 'Type your question...'}
                className="flex-1 rounded-xl h-10 text-sm"
                disabled={isStreaming}
              />
              <Button
                size="icon"
                className="h-10 w-10 rounded-xl shrink-0"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              {language === 'th' 
                ? '⚕️ ไม่ใช่คำแนะนำทางการแพทย์ กรุณาปรึกษาแพทย์' 
                : '⚕️ Not medical advice. Please consult a healthcare provider.'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
