/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Msg = { role: 'user' | 'assistant'; content: string };

export function ContactAssistant({ th }: { th: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: 'nearest' }), [msgs, busy]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: question }];
    setMsgs(next); setText(''); setBusy(true);
    const { data, error } = await supabase.functions.invoke('contact-assistant', { body: { messages: next } });
    const fail = th ? 'ตอบไม่ได้ในตอนนี้ ลองอีกครั้ง หรือแชท LINE กับทีมงาน' : "Couldn't answer right now. Try again or chat with staff on LINE.";
    setMsgs([...next, { role: 'assistant', content: !error && data?.reply ? data.reply : fail }]);
    setBusy(false);
  };

  const quick = th
    ? ['ตรวจ HIV กี่วันจึงชัวร์?', 'ขึ้นขีดจางๆ แปลว่าอะไร?', 'ขอชุดตรวจฟรีได้ที่ไหน?']
    : ['How long until an HIV test is accurate?', 'What does a faint line mean?', 'Where can I get a free kit?'];

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4" aria-label={th ? 'ผู้ช่วยตอบคำถามอัตโนมัติ' : 'Automatic assistant'}>
      <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
        <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
        {th ? 'ถามผู้ช่วยอัตโนมัติ ตอบทันที' : 'Ask our automatic assistant'}
      </h2>
      <p className="text-sm text-muted-foreground">
        {th ? 'ตอบเรื่องการตรวจ HIV และชุดตรวจทันที ตอบโดย AI ไม่ใช่การวินิจฉัย ไม่ต้องใส่ชื่อหรือเบอร์โทร' : 'Instant answers about HIV testing and kits. AI-generated, not a diagnosis. Do not share your name or phone.'}
      </p>
      <div className="max-h-96 space-y-2 overflow-y-auto" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'ml-auto max-w-[85%] rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground' : 'max-w-[90%] rounded-xl bg-muted px-3 py-2 text-sm text-foreground prose prose-sm dark:prose-invert'}>
            {m.role === 'user' ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
          </div>
        ))}
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label={th ? 'กำลังตอบ' : 'Answering'} />}
        <div ref={end} />
      </div>
      {msgs.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <Button key={q} variant="outline" size="sm" onClick={() => ask(q)}>{q}</Button>
          ))}
        </div>
      )}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={800} placeholder={th ? 'พิมพ์คำถาม...' : 'Type your question...'} aria-label={th ? 'คำถาม' : 'Question'} />
        <Button type="submit" size="icon" disabled={busy || !text.trim()} aria-label={th ? 'ส่ง' : 'Send'}><Send className="h-4 w-4" /></Button>
      </form>
    </section>
  );
}
