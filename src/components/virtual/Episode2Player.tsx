import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  EP2_SCENES, EP2_KNOWLEDGE, EP2_SCENE_ORDER, EP2_STORY_ID,
  getEp2NextScene, getEp2ResultType, getEp2ResultDescription,
  type Ep2Scene, type Ep2Choice,
} from "@/config/ep2StoryData";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/visitorId";
import { trackJourneyEvent } from "@/lib/journeyTracker";

/* ─── Scene Colors ─── */
const SCENE_COLORS: Record<string, { bg: string; accent: string }> = {
  '1': { bg: '#0e0e1a', accent: '#00e5ff' },
  '2': { bg: '#e8f4f8', accent: '#ff4da6' },
  '3': { bg: '#eef6fa', accent: '#4a90d9' },
  '4': { bg: '#f5f0ff', accent: '#9b30ff' },
  '5': { bg: '#fdf6e8', accent: '#ffe600' },
  '6a': { bg: '#f0f8f4', accent: '#00cc70' },
  '6b': { bg: '#f5f0ff', accent: '#9b30ff' },
  '7': { bg: '#fff5e0', accent: '#ffdd00' },
};

const CHOICE_COLORS = { a: '#ff4da6', b: '#00e5ff', c: '#ffe600' };
const KNOW_COLORS: Record<string, { border: string; bg: string; btn: string }> = {
  cyan: { border: '#00e5ff', bg: '#0a1a2a', btn: '#00e5ff' },
  green: { border: '#00cc70', bg: '#0a1a10', btn: '#00cc70' },
  yellow: { border: '#ffe600', bg: '#1a1a08', btn: '#ffe600' },
  mint: { border: '#7fffd4', bg: '#0a1a18', btn: '#7fffd4' },
};

interface SessionState {
  sessionId: string | null;
  scores: { knowledge: number; readiness: number; community: number };
  path: string;
  startedAt: string;
}

export function Episode2Player({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'title' | 'play' | 'result'>('title');
  const [currentSceneId, setCurrentSceneId] = useState<number | string>(1);
  const [knowKey, setKnowKey] = useState<string | null>(null);
  const [pendingNext, setPendingNext] = useState<number | string | 'result' | null>(null);
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState>({
    sessionId: null,
    scores: { knowledge: 0, readiness: 0, community: 0 },
    path: 'none',
    startedAt: new Date().toISOString(),
  });

  const scene = EP2_SCENES.find(s => String(s.id) === String(currentSceneId));
  const sceneIdx = EP2_SCENE_ORDER.indexOf(currentSceneId as any);

  // Create session
  const createSession = useCallback(async () => {
    try {
      const anonymousId = getVisitorId();
      const { data: { user } } = await supabase.auth.getUser();
      const deviceType = /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

      const { data } = await supabase.from('virtual_story_sessions').insert({
        story_id: EP2_STORY_ID,
        episode_number: 2,
        user_id: user?.id || null,
        anonymous_id: anonymousId,
        source_page: '/virtual/ep2',
        device_type: deviceType,
        language: 'th',
      } as any).select('id').single();

      if (data) {
        setSession(prev => ({ ...prev, sessionId: data.id }));
      }

      trackJourneyEvent('virtual', 'virtual_story_started', {
        story_id: EP2_STORY_ID,
        episode_number: 2,
      });
    } catch { /* silent */ }
  }, []);

  // Track event
  const trackEvent = useCallback(async (eventName: string, meta?: Record<string, unknown>) => {
    if (!session.sessionId) return;
    try {
      await supabase.from('virtual_story_events').insert({
        session_id: session.sessionId,
        story_id: EP2_STORY_ID,
        event_name: eventName,
        ...meta,
      } as any);
    } catch { /* silent */ }

    trackJourneyEvent('virtual', eventName, {
      story_id: EP2_STORY_ID,
      episode_number: 2,
      ...meta,
    });
  }, [session.sessionId]);

  // Start game
  const startGame = useCallback(() => {
    setPhase('play');
    setCurrentSceneId(1);
    setSession(prev => ({
      ...prev,
      scores: { knowledge: 0, readiness: 0, community: 0 },
      path: 'none',
      startedAt: new Date().toISOString(),
    }));
    createSession();
  }, [createSession]);

  // Choose
  const handleChoice = useCallback((choice: Ep2Choice) => {
    setChosenKey(choice.key);

    // Update scores
    const newScores = { ...session.scores };
    newScores.knowledge += choice.score.knowledge;
    newScores.readiness += choice.score.readiness;
    newScores.community += choice.score.community;

    const newPath = choice.path || session.path;
    setSession(prev => ({ ...prev, scores: newScores, path: newPath }));

    // Track
    trackEvent('virtual_story_choice_selected', {
      scene_id: String(currentSceneId),
      scene_label: scene?.label,
      choice_key: choice.key,
      choice_text: choice.text.replace(/<[^>]+>/g, ''),
      path_selected: newPath,
    });

    const next = getEp2NextScene(currentSceneId, newPath, choice);

    if (choice.know) {
      setKnowKey(choice.know);
      setPendingNext(next);
      trackEvent('virtual_story_knowledge_opened', {
        scene_id: String(currentSceneId),
        topic: choice.know,
      });
    } else {
      setTimeout(() => {
        goToNext(next);
      }, 400);
    }
  }, [session, currentSceneId, scene, trackEvent]);

  const goToNext = useCallback((next: number | string | 'result') => {
    setChosenKey(null);
    if (next === 'result') {
      showResult();
    } else {
      setCurrentSceneId(next);
      trackEvent('virtual_story_scene_viewed', {
        scene_id: String(next),
      });
    }
  }, [trackEvent]);

  const closeKnowledge = useCallback(() => {
    setKnowKey(null);
    if (pendingNext !== null) {
      goToNext(pendingNext);
      setPendingNext(null);
    }
  }, [pendingNext, goToNext]);

  const showResult = useCallback(async () => {
    setPhase('result');
    const resultType = getEp2ResultType(session.scores);

    // Update session
    if (session.sessionId) {
      try {
        await supabase.from('virtual_story_sessions').update({
          completed: true,
          completed_at: new Date().toISOString(),
          result_type: resultType,
          path_selected: session.path,
          knowledge_score: session.scores.knowledge,
          readiness_score: session.scores.readiness,
          community_score: session.scores.community,
        } as any).eq('id', session.sessionId);
      } catch { /* silent */ }
    }

    trackEvent('virtual_story_completed', {
      result_type: resultType,
      path_selected: session.path,
      knowledge_score: session.scores.knowledge,
      readiness_score: session.scores.readiness,
      community_score: session.scores.community,
    });
  }, [session, trackEvent]);

  const handleCta = useCallback((target: string, label: string) => {
    trackEvent('virtual_story_cta_clicked', { cta_target: target, choice_text: label });
    navigate(target);
  }, [navigate, trackEvent]);

  const replay = useCallback(() => {
    trackEvent('virtual_story_replayed', {});
    setPhase('title');
    setCurrentSceneId(1);
    setChosenKey(null);
    setKnowKey(null);
    setPendingNext(null);
  }, [trackEvent]);

  // ─── TITLE SCREEN ───
  if (phase === 'title') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6 py-8 text-center"
           style={{ background: '#0e0e1a', color: '#f0eeff' }}>
        <button onClick={onBack} className="absolute top-4 left-4 p-2 rounded-lg" style={{ color: '#7fffd4' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#7fffd4', letterSpacing: 2 }}>
          testD · NIGHT MODE
        </div>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: '#00e5ff', textShadow: '3px 3px 0 #005f69' }}>
          EPISODE 2
        </div>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#ff4da6', letterSpacing: 1 }}>
          มาร์คกับเข็มที่เขายังไม่รู้ว่ามีอยู่
        </div>

        <div style={{
          background: 'rgba(255,77,166,0.08)', border: '1px solid rgba(255,77,166,0.3)',
          borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'rgba(255,170,210,0.8)',
          lineHeight: 1.6, maxWidth: 300
        }}>
          🌙 ต่อจาก Episode 1<br/>หลังคืนที่มาร์คไม่มีใครเตือน...
        </div>

        <p style={{ fontSize: 14, color: 'rgba(240,238,255,0.55)', lineHeight: 1.7, maxWidth: 300 }}>
          ตอนนี้มาร์คมีคำถามอยู่ในหัว<br/>และกำลังหาคำตอบ 💊
        </p>

        <div style={{ width: '70%', height: 2, background: 'linear-gradient(90deg,#ff4da6,#ffe600,#00e5ff,#7fffd4,#9b30ff)', borderRadius: 2 }} />

        <button onClick={startGame} style={{
          width: '100%', maxWidth: 280, padding: 16,
          background: 'linear-gradient(135deg,#00e5ff,#0097a7)', border: 'none', borderRadius: 50,
          fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: 'white', cursor: 'pointer',
          boxShadow: '0 4px 0 #005f69, 0 0 20px rgba(0,229,255,0.3)',
        }}>
          ▶ CONTINUE MARC'S STORY
        </button>

        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'rgba(255,255,255,0.2)' }}>
          testD · for everyone · 🏳️‍🌈
        </div>
      </div>
    );
  }

  // ─── RESULT SCREEN ───
  if (phase === 'result') {
    const { knowledge, readiness, community } = session.scores;
    const kP = Math.min(100, Math.round(knowledge / 16 * 100));
    const rP = Math.min(100, Math.round(readiness / 16 * 100));
    const cP = Math.min(100, Math.round(community / 16 * 100));
    const resultType = getEp2ResultType(session.scores);
    const desc = getEp2ResultDescription(resultType);

    return (
      <div className="h-full overflow-y-auto flex flex-col items-center gap-4 px-5 py-7"
           style={{ background: '#0e0e1a', color: '#f0eeff' }}>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: 'rgba(240,238,255,0.55)', letterSpacing: 1 }}>
          testD NIGHT MODE · EPISODE 2 COMPLETE
        </div>
        <div style={{ width: '70%', height: 2, background: 'linear-gradient(90deg,#ff4da6,#ffe600,#00e5ff,#7fffd4,#9b30ff)', borderRadius: 2 }} />
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: '#ffe600', textShadow: '2px 2px 0 #7a6000', textAlign: 'center', lineHeight: 1.9 }}>
          {resultType}
        </div>
        <p style={{ fontSize: 14, color: 'rgba(240,238,255,0.7)', textAlign: 'center', lineHeight: 1.65, maxWidth: 340 }}>
          {desc}
        </p>

        {/* Score Board */}
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1.5px solid #2a2a3e', borderRadius: 14, overflow: 'hidden' }}>
          {[
            { icon: '🧠', label: 'KNOWLEDGE', pct: kP, color: '#00e5ff' },
            { icon: '💪', label: 'READINESS', pct: rP, color: '#ff4da6' },
            { icon: '🤝', label: 'COMMUNITY', pct: cP, color: '#7fffd4' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < 2 ? '1px solid #2a2a3e' : 'none' }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: 'rgba(240,238,255,0.55)', display: 'block', marginBottom: 4 }}>{s.label}</span>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: 4, transition: 'width 1s ease' }} />
                </div>
              </div>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#f0eeff' }}>{s.pct}%</span>
            </div>
          ))}
        </div>

        {/* Path tip */}
        <div style={{
          width: '100%', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14,
          borderLeft: `3px solid ${session.path === 'oral' ? '#00cc70' : '#7fffd4'}`,
        }}>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: session.path === 'oral' ? '#00cc70' : '#7fffd4', display: 'block', marginBottom: 8 }}>
            {session.path === 'oral' ? '💊 PATH ของคุณ: PrEP กิน' : '💉 PATH ของคุณ: รอ Lenacapavir'}
          </span>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.8)' }}>
            {session.path === 'oral'
              ? 'ทางเลือกที่ดีมาก! เริ่มป้องกันได้ทันที ใช้ testD Tracker เพื่อ track streak และรับ badge'
              : 'ระหว่างรอ อย่าลืมป้องกันตัวเองด้วย — Subscribe ใน testD เพื่อรับแจ้งเตือนทันทีเมื่อ Lenacapavir พร้อมในไทย'}
          </p>
        </div>

        {/* CTAs */}
        <div style={{ width: '100%' }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: 'rgba(240,238,255,0.55)', textAlign: 'center', marginBottom: 12 }}>
            🌈 ขั้นต่อไปกับ testD
          </div>

          <button onClick={() => handleCta('/booking', 'เริ่ม PrEP วันนี้')} style={{
            width: '100%', padding: 16, background: 'linear-gradient(135deg,#ff4da6,#9b30ff)', border: 'none',
            borderRadius: 50, fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: 'white', cursor: 'pointer',
            boxShadow: '0 4px 0 #4a0090,0 8px 24px rgba(155,48,255,0.4)', lineHeight: 1.9, marginBottom: 10,
          }}>
            💊 เริ่ม PrEP วันนี้<br/>
            <span style={{ fontSize: 7, opacity: 0.8 }}>ขอ kit · นัดคลินิก · เปิด Tracker</span>
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            {[
              { icon: '📅', title: 'PrEP TRACKER', desc: 'Track streak · badge · reminder', route: '/medication-tracker', color: '#00e5ff' },
              { icon: '💉', title: 'LENA UPDATES', desc: 'รับแจ้งเตือนเมื่อพร้อมในไทย', route: '/info', color: '#7fffd4' },
              { icon: '📖', title: 'บทความ & ความรู้', desc: 'HIV · PrEP · Lenacapavir', route: '/info', color: '#ffe600' },
              { icon: '💬', title: 'ปรึกษา ANONYMOUS', desc: 'LINE · นัดหมอ · คลินิกใกล้บ้าน', route: '/support-chat', color: '#00cc70' },
            ].map((svc, i) => (
              <button key={i} onClick={() => handleCta(svc.route, svc.title)} style={{
                background: 'rgba(255,255,255,0.04)', border: `1.5px solid ${svc.color}30`,
                borderRadius: 12, padding: '12px 10px', cursor: 'pointer', textAlign: 'left', color: '#f0eeff',
              }}>
                <span style={{ fontSize: 22, display: 'block', marginBottom: 6 }}>{svc.icon}</span>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: svc.color, display: 'block', marginBottom: 4 }}>{svc.title}</span>
                <span style={{ fontSize: 11, color: 'rgba(240,238,255,0.55)', lineHeight: 1.4, display: 'block' }}>{svc.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <button onClick={replay} style={{
          width: '100%', padding: 13, background: 'transparent', border: '1.5px solid #2a2a3e',
          borderRadius: 50, fontFamily: "'Press Start 2P', monospace", fontSize: 8,
          color: 'rgba(240,238,255,0.55)', cursor: 'pointer',
        }}>
          🔄 เล่นใหม่ ลองเลือกต่างออกไป
        </button>
      </div>
    );
  }

  // ─── PLAY SCREEN ───
  if (!scene) return null;

  const sceneColor = SCENE_COLORS[String(currentSceneId)] || { bg: '#0e0e1a', accent: '#00e5ff' };
  const isDarkScene = ['1'].includes(String(currentSceneId));

  return (
    <div className="h-full flex flex-col relative" style={{ background: '#0e0e1a', color: '#f0eeff' }}>
      {/* Scene visual area */}
      <div style={{
        position: 'relative', width: '100%', height: '30%', minHeight: 140, maxHeight: 220,
        background: sceneColor.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0,
      }}>
        {/* Scene illustration placeholder - pixel dots */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.15 }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: 4, height: 4,
              background: sceneColor.accent,
              borderRadius: 1,
            }} />
          ))}
        </div>

        {/* Scene icon */}
        <div style={{ fontSize: 48, opacity: 0.6 }}>
          {String(currentSceneId) === '1' ? '🛏️' :
           String(currentSceneId) === '2' ? '🏥' :
           String(currentSceneId) === '3' ? '💊' :
           String(currentSceneId) === '4' ? '💉' :
           String(currentSceneId) === '5' ? '🤔' :
           String(currentSceneId) === '6a' ? '⏰' :
           String(currentSceneId) === '6b' ? '📱' : '🌅'}
        </div>

        {/* HUD */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '7px 10px' }}>
          <div style={{
            background: 'rgba(10,10,20,0.85)', border: '1px solid #2a2a3e', borderRadius: 5,
            padding: '4px 8px', fontFamily: "'Press Start 2P', monospace", fontSize: 6, lineHeight: 1.6,
            color: 'rgba(240,238,255,0.55)',
          }}>
            <span style={{ color: '#7fffd4' }}>EP2</span> · SCENE <span style={{ color: '#ffe600' }}>{String(currentSceneId)}</span>/7
          </div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {EP2_SCENE_ORDER.map((_, i) => (
              <span key={i} style={{ fontSize: 12, opacity: i <= sceneIdx ? 1 : 0.2 }}>💜</span>
            ))}
          </div>
        </div>

        {/* Path badge */}
        {session.path !== 'none' && (
          <div style={{
            position: 'absolute', bottom: 8, right: 10, background: 'rgba(0,0,0,0.7)',
            border: `1px solid ${session.path === 'oral' ? '#00e5ff' : '#9b30ff'}`,
            borderRadius: 20, padding: '3px 8px',
            fontFamily: "'Press Start 2P', monospace", fontSize: 6,
            color: session.path === 'oral' ? '#00e5ff' : '#9b30ff',
          }}>
            {session.path === 'oral' ? '💊 PrEP กิน' : '💉 Lenacapavir path'}
          </div>
        )}

        {/* Back button */}
        <button onClick={onBack} style={{
          position: 'absolute', top: 7, right: 10, background: 'rgba(10,10,20,0.85)',
          border: '1px solid #2a2a3e', borderRadius: 5, padding: '4px 8px', cursor: 'pointer',
          color: '#ff4da6', fontFamily: "'Press Start 2P', monospace", fontSize: 6,
        }}>
          ✕
        </button>
      </div>

      {/* Panel */}
      <div style={{ flex: 1, background: '#16161f', borderTop: '2px solid #2a2a3e', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Scene label */}
        <div style={{ background: '#2a2a3e', padding: '5px 14px', fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#00e5ff', letterSpacing: 1, flexShrink: 0 }}>
          {scene.label}
        </div>

        {/* Narration */}
        <div style={{ padding: '14px 16px 10px', fontSize: 15, fontWeight: 600, lineHeight: 1.65, color: '#f0eeff', flexShrink: 0, minHeight: 72 }}
             dangerouslySetInnerHTML={{ __html: scene.narration.replace(/class="hl"/g, 'style="color:#ff4da6;font-weight:800"').replace(/class="hl2"/g, 'style="color:#00e5ff;font-weight:800"').replace(/class="hl3"/g, 'style="color:#ffe600;font-weight:800"').replace(/class="hl4"/g, 'style="color:#7fffd4;font-weight:800"') }} />

        {/* Choices */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {scene.choices.map((choice) => (
            <button key={choice.key}
              onClick={() => !chosenKey && handleChoice(choice)}
              disabled={!!chosenKey}
              style={{
                background: chosenKey === choice.key ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${chosenKey && chosenKey !== choice.key ? '#1a1a2a' : '#2a2a3e'}`,
                borderRadius: 10, padding: '12px 14px', cursor: chosenKey ? 'default' : 'pointer',
                textAlign: 'left', position: 'relative', overflow: 'hidden',
                opacity: chosenKey && chosenKey !== choice.key ? 0.4 : 1,
                transition: 'all 0.15s',
                borderLeftWidth: 3, borderLeftColor: CHOICE_COLORS[choice.cls] || '#2a2a3e',
                color: '#f0eeff',
              }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 4 }}>
                {choice.key.toUpperCase()}
              </span>
              <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.45 }}>{choice.text}</div>
              {choice.hint && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3, display: 'block' }}>{choice.hint}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge Overlay */}
      {knowKey && EP2_KNOWLEDGE[knowKey] && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 90,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) closeKnowledge(); }}>
          <div style={{
            background: '#16161f', width: '100%', maxWidth: 430, borderRadius: '20px 20px 0 0',
            borderTop: `3px solid ${KNOW_COLORS[EP2_KNOWLEDGE[knowKey].cls]?.border || '#ff4da6'}`,
            padding: '20px 20px 32px', maxHeight: '88vh', overflowY: 'auto',
          }}>
            <span style={{ fontSize: 40, display: 'block', textAlign: 'center', marginBottom: 8 }}>
              {EP2_KNOWLEDGE[knowKey].icon}
            </span>
            <span style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 7, textAlign: 'center', display: 'block', marginBottom: 12,
              letterSpacing: 1, color: KNOW_COLORS[EP2_KNOWLEDGE[knowKey].cls]?.border || '#ff4da6',
            }}>
              {EP2_KNOWLEDGE[knowKey].tag}
            </span>
            <div style={{ fontSize: 18, fontWeight: 800, textAlign: 'center', marginBottom: 14, lineHeight: 1.3, color: '#f0eeff' }}>
              {EP2_KNOWLEDGE[knowKey].title}
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14,
              fontSize: 13.5, lineHeight: 1.75, color: 'rgba(255,255,255,0.85)', marginBottom: 16,
            }} dangerouslySetInnerHTML={{ __html: EP2_KNOWLEDGE[knowKey].body }} />

            <button onClick={closeKnowledge} style={{
              width: '100%', padding: 14, borderRadius: 50, border: 'none',
              fontFamily: "'Press Start 2P', monospace", fontSize: 9, cursor: 'pointer', color: 'white',
              background: `linear-gradient(135deg, ${KNOW_COLORS[EP2_KNOWLEDGE[knowKey].cls]?.btn || '#ff4da6'}, ${KNOW_COLORS[EP2_KNOWLEDGE[knowKey].cls]?.border || '#c2006e'})`,
            }}>
              {EP2_KNOWLEDGE[knowKey].btnText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
