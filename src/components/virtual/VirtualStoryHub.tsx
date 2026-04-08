import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Play } from "lucide-react";
import { EP2_TOPICS } from "@/config/ep2StoryData";

interface Props {
  onSelectEp1: () => void;
  onSelectEp2: () => void;
  onSelectPrepHunt?: () => void;
  onBack?: () => void;
}

export function VirtualStoryHub({ onSelectEp1, onSelectEp2, onBack }: Props) {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const handleTopicClick = (topic: typeof EP2_TOPICS[0]) => {
    setSelectedTopic(topic.id);
    setTimeout(() => {
      if (topic.episode === 1) onSelectEp1();
      else onSelectEp2();
    }, 300);
  };

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#0e0e1a', color: '#f0eeff' }}>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg" style={{ color: '#7fffd4' }}>
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: '#00e5ff', lineHeight: 1.8 }}>
              VIRTUAL STORIES
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(240,238,255,0.55)', marginTop: 4 }}>
              เรียนรู้ผ่านเรื่องราวของมาร์ค — เลือกตอนหรือเลือกตามหัวข้อ
            </p>
          </div>
        </div>

        {/* Topic Chips */}
        <div>
          <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: 'rgba(240,238,255,0.55)', letterSpacing: 1, marginBottom: 8 }}>
            🏷️ CHOOSE BY TOPIC
          </h2>
          <div className="flex flex-wrap gap-2">
            {EP2_TOPICS.map((topic) => (
              <button key={topic.id} onClick={() => handleTopicClick(topic)}
                style={{
                  background: selectedTopic === topic.id ? `${topic.episode === 2 ? '#00e5ff' : '#ff4da6'}20` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedTopic === topic.id ? (topic.episode === 2 ? '#00e5ff' : '#ff4da6') : '#2a2a3e'}`,
                  borderRadius: 20, padding: '6px 14px', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, color: topic.episode === 2 ? '#00e5ff' : '#ff4da6',
                  transition: 'all 0.2s',
                }}>
                {topic.labelTh}
              </button>
            ))}
          </div>
        </div>

        {/* Episode Cards */}
        <div className="flex flex-col gap-4">
          {/* Episode 2 — NEW */}
          <button onClick={onSelectEp2}
            className="text-left relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(0,229,255,0.08), rgba(155,48,255,0.08))',
              border: '1.5px solid rgba(0,229,255,0.3)',
              borderRadius: 16, padding: 16, cursor: 'pointer',
              transition: 'all 0.2s',
            }}>
            {/* NEW badge */}
            <div style={{
              position: 'absolute', top: 12, right: 12,
              background: 'linear-gradient(135deg, #ff4da6, #9b30ff)',
              borderRadius: 12, padding: '3px 10px',
              fontFamily: "'Press Start 2P', monospace", fontSize: 6,
              color: 'white', letterSpacing: 1,
            }}>
              NEW
            </div>

            <div className="flex items-start gap-3">
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                background: 'linear-gradient(135deg, #00e5ff20, #9b30ff20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, flexShrink: 0,
              }}>
                💉
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#7fffd4', letterSpacing: 1, marginBottom: 4 }}>
                  EPISODE 2
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#f0eeff', lineHeight: 1.4, marginBottom: 6 }}>
                  มาร์คกับเข็มที่เขายังไม่รู้ว่ามีอยู่
                </h3>
                <p style={{ fontSize: 12, color: 'rgba(240,238,255,0.55)', lineHeight: 1.5, marginBottom: 8 }}>
                  เรื่องของการทำความเข้าใจ PrEP และทางเลือกใหม่อย่าง Lenacapavir
                </p>
                <div className="flex flex-wrap gap-1">
                  {['PrEP', 'Friendly clinic', 'Lenacapavir', 'Decision making'].map(tag => (
                    <span key={tag} style={{
                      background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)',
                      borderRadius: 8, padding: '2px 8px', fontSize: 10, color: '#00e5ff',
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginTop: 12,
              fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#00e5ff',
            }}>
              <Play size={12} /> PLAY EPISODE 2
            </div>
          </button>

          {/* Episode 1 */}
          <button onClick={onSelectEp1}
            className="text-left"
            style={{
              background: 'rgba(255,77,166,0.05)',
              border: '1.5px solid rgba(255,77,166,0.2)',
              borderRadius: 16, padding: 16, cursor: 'pointer',
              transition: 'all 0.2s',
            }}>
            <div className="flex items-start gap-3">
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                background: 'rgba(255,77,166,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, flexShrink: 0,
              }}>
                🌙
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#ff4da6', letterSpacing: 1, marginBottom: 4 }}>
                  EPISODE 1
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#f0eeff', lineHeight: 1.4, marginBottom: 6 }}>
                  คืนที่ไม่มีใครเตือน
                </h3>
                <p style={{ fontSize: 12, color: 'rgba(240,238,255,0.55)', lineHeight: 1.5, marginBottom: 8 }}>
                  เรื่องของการเดท ความยินยอม และการดูแลตัวเอง
                </p>
                <div className="flex flex-wrap gap-1">
                  {['Date safety', 'Consent', 'Harm reduction'].map(tag => (
                    <span key={tag} style={{
                      background: 'rgba(255,77,166,0.1)', border: '1px solid rgba(255,77,166,0.2)',
                      borderRadius: 8, padding: '2px 8px', fontSize: 10, color: '#ff4da6',
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginTop: 12,
              fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#ff4da6',
            }}>
              <Play size={12} /> PLAY EPISODE 1
            </div>
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'rgba(255,255,255,0.15)', paddingBottom: 20 }}>
          testD · privacy first · 🏳️‍🌈
        </div>
      </div>
    </div>
  );
}
