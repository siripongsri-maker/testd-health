/**
 * Virtual Story Smart Insight Engine
 * Rule-based insight generation from aggregated analytics data.
 * No external AI API needed — deterministic, explainable logic.
 */

// ─── Thresholds (easily tunable) ───
export const THRESHOLDS = {
  COMPLETION_STRONG: 75,
  COMPLETION_MODERATE: 40,
  CTA_WEAK_RATIO: 0.2,       // ctaClicks / completions < 20%
  REPLAY_HIGH_RATIO: 0.3,    // replays / starts > 30%
  DROPOFF_SPIKE: 0.25,       // scene drop > 25% vs previous
  MIN_SAMPLE: 10,            // minimum starts for full insights
  MIN_SAMPLE_LIMITED: 3,     // minimum for limited insights
};

// ─── Types ───
export type InsightSeverity = 'info' | 'warning' | 'success' | 'danger';
export type FlagType =
  | 'high_dropoff' | 'low_conversion' | 'high_curiosity'
  | 'zero_click_cta' | 'needs_content_review' | 'strong_completion'
  | 'high_replay';

export interface Insight {
  id: string;
  type: 'completion' | 'cta' | 'dropoff' | 'path' | 'result' | 'replay' | 'knowledge';
  severity: InsightSeverity;
  finding: string;
  meaning: string;
  action: string;
}

export interface InsightFlag {
  type: FlagType;
  label: string;
  severity: InsightSeverity;
  detail: string;
}

export interface ContentOpportunity {
  label: string;
  detail: string;
}

export interface ExecutiveSummary {
  whatHappened: string;
  whatItMeans: string;
  recommendedAction: string;
}

export interface StatsInput {
  totalStarts: number;
  totalCompletions: number;
  completionRate: number;
  replayCount: number;
  pathDistribution: { name: string; value: number }[];
  resultDistribution: { name: string; value: number }[];
  sceneDropoff: { scene: string; count: number }[];
  ctaClicks: { name: string; value: number }[];
  monthlyTrend: { month: string; starts: number; completions: number }[];
  knowledgeOpens?: { scene: string; count: number }[];
}

export interface SmartInsightsResult {
  summary: ExecutiveSummary;
  insights: Insight[];
  flags: InsightFlag[];
  actions: string[];
  contentOpportunities: ContentOpportunity[];
  isLimited: boolean;
  csvSummary: Record<string, string>;
}

// ─── Helpers ───
function topItem(arr: { name: string; value: number }[]): { name: string; value: number } | null {
  if (!arr.length) return null;
  return arr.reduce((a, b) => (b.value > a.value ? b : a));
}

function totalCtaClicks(clicks: { name: string; value: number }[]): number {
  return clicks.reduce((s, c) => s + c.value, 0);
}

function findDropoffSpike(scenes: { scene: string; count: number }[]): { scene: string; dropPct: number } | null {
  if (scenes.length < 2) return null;
  let worst: { scene: string; dropPct: number } | null = null;
  for (let i = 1; i < scenes.length; i++) {
    const prev = scenes[i - 1].count;
    if (prev === 0) continue;
    const drop = (prev - scenes[i].count) / prev;
    if (drop > THRESHOLDS.DROPOFF_SPIKE && (!worst || drop > worst.dropPct)) {
      worst = { scene: scenes[i].scene, dropPct: Math.round(drop * 100) };
    }
  }
  return worst;
}

// ─── Main Generator ───
export function generateSmartInsights(stats: StatsInput): SmartInsightsResult {
  const { totalStarts, totalCompletions, completionRate, replayCount, pathDistribution, resultDistribution, sceneDropoff, ctaClicks } = stats;
  const totalCta = totalCtaClicks(ctaClicks);
  const isLimited = totalStarts < THRESHOLDS.MIN_SAMPLE;
  const tooFew = totalStarts < THRESHOLDS.MIN_SAMPLE_LIMITED;

  const insights: Insight[] = [];
  const flags: InsightFlag[] = [];
  const actions: string[] = [];
  const contentOpportunities: ContentOpportunity[] = [];

  if (tooFew) {
    return {
      summary: {
        whatHappened: 'ข้อมูลยังมีน้อยมาก ยังไม่สามารถสรุปแนวโน้มได้',
        whatItMeans: 'ควรรอให้มีผู้เล่นมากกว่านี้ก่อนวิเคราะห์',
        recommendedAction: 'แชร์ลิงก์ Virtual Stories ให้กลุ่มเป้าหมายเพิ่มเติม',
      },
      insights: [],
      flags: [],
      actions: ['แชร์ลิงก์เพื่อเพิ่มจำนวนผู้เล่น'],
      contentOpportunities: [],
      isLimited: true,
      csvSummary: { status: 'insufficient_data', starts: String(totalStarts) },
    };
  }

  // ── 1. Completion insight ──
  if (completionRate >= THRESHOLDS.COMPLETION_STRONG) {
    insights.push({
      id: 'completion_strong', type: 'completion', severity: 'success',
      finding: `อัตราเล่นจบสูงถึง ${completionRate}%`,
      meaning: 'เนื้อหามีความน่าสนใจ ผู้ใช้ส่วนใหญ่ engage จนจบ',
      action: 'เน้นเพิ่ม CTA ตอนจบเพื่อพาผู้ใช้ไปบริการจริง',
    });
    flags.push({ type: 'strong_completion', label: 'Strong Completion', severity: 'success', detail: `${completionRate}%` });
  } else if (completionRate >= THRESHOLDS.COMPLETION_MODERATE) {
    insights.push({
      id: 'completion_moderate', type: 'completion', severity: 'info',
      finding: `อัตราเล่นจบอยู่ที่ ${completionRate}%`,
      meaning: 'มีผู้ใช้จำนวนหนึ่งหลุดออกก่อนจบ อาจมีจุดที่เนื้อหายาวเกินไป',
      action: 'ตรวจสอบ scene ที่มี drop-off สูงและลดความยาว',
    });
  } else {
    insights.push({
      id: 'completion_low', type: 'completion', severity: 'danger',
      finding: `อัตราเล่นจบต่ำเพียง ${completionRate}%`,
      meaning: 'ผู้ใช้ส่วนใหญ่ไม่เล่นจนจบ อาจมีปัญหาด้านเนื้อหาหรือ UX',
      action: 'ปรับความยาว scene, เพิ่ม visual cue, และตรวจสอบ drop-off point',
    });
    flags.push({ type: 'needs_content_review', label: 'Needs Content Review', severity: 'danger', detail: `Completion ${completionRate}%` });
  }

  // ── 2. CTA conversion insight ──
  const ctaRatio = totalCompletions > 0 ? totalCta / totalCompletions : 0;
  if (totalCompletions > 0 && ctaRatio < THRESHOLDS.CTA_WEAK_RATIO) {
    insights.push({
      id: 'cta_weak', type: 'cta', severity: 'warning',
      finding: `CTA clicks ต่ำ (${totalCta} clicks จาก ${totalCompletions} คนที่เล่นจบ)`,
      meaning: 'ผู้ใช้ engage กับเนื้อหาแต่ยังไม่ถูกพาไปสู่บริการจริง',
      action: 'ทดสอบ CTA copy ใหม่ และย้ายปุ่ม CTA ขึ้นก่อน ending text',
    });
    flags.push({ type: 'low_conversion', label: 'Low Conversion', severity: 'warning', detail: `${Math.round(ctaRatio * 100)}% CTA rate` });
    actions.push('ปรับ CTA copy และตำแหน่งปุ่มตอนจบ');
  } else if (totalCompletions > 0 && totalCta > 0) {
    insights.push({
      id: 'cta_ok', type: 'cta', severity: 'success',
      finding: `CTA conversion อยู่ในระดับดี (${Math.round(ctaRatio * 100)}%)`,
      meaning: 'ผู้ใช้ที่เล่นจบมีแนวโน้มคลิก CTA ต่อ',
      action: 'รักษา CTA flow เดิม และวิเคราะห์ว่า CTA ไหน perform ดีสุด',
    });
  }
  if (totalCta === 0 && totalCompletions > 0) {
    flags.push({ type: 'zero_click_cta', label: 'Zero-click CTA', severity: 'danger', detail: 'ไม่มีใครคลิก CTA เลย' });
    actions.push('ตรวจสอบว่าปุ่ม CTA แสดงถูกต้องและชัดเจน');
  }

  // ── 3. Scene drop-off insight ──
  const spike = findDropoffSpike(sceneDropoff);
  if (spike) {
    insights.push({
      id: 'dropoff_spike', type: 'dropoff', severity: 'warning',
      finding: `Scene "${spike.scene}" มี drop-off สูง ${spike.dropPct}% เทียบกับ scene ก่อนหน้า`,
      meaning: 'อาจมีความยาวหรือความซับซ้อนเกินไปใน scene นี้',
      action: 'ลดข้อความหรือเพิ่ม visual cue ใน scene นี้',
    });
    flags.push({ type: 'high_dropoff', label: 'High Drop-off', severity: 'warning', detail: `Scene ${spike.scene}: -${spike.dropPct}%` });
    actions.push(`ปรับเนื้อหา Scene "${spike.scene}" ให้กระชับขึ้น`);
  }

  // ── 4. Path distribution insight ──
  const topPath = topItem(pathDistribution);
  if (topPath && pathDistribution.length > 1) {
    const totalPaths = pathDistribution.reduce((s, p) => s + p.value, 0);
    const pct = totalPaths > 0 ? Math.round((topPath.value / totalPaths) * 100) : 0;
    insights.push({
      id: 'path_dominant', type: 'path', severity: 'info',
      finding: `Path "${topPath.name}" ถูกเลือกมากสุด (${pct}%)`,
      meaning: `ผู้ใช้ส่วนใหญ่เลือกแนวทางนี้ สะท้อนความสนใจหลักของกลุ่มเป้าหมาย`,
      action: 'ทำ content spin-off หรือ campaign เจาะกลุ่มตาม path นี้',
    });
    contentOpportunities.push({
      label: `Path ยอดนิยม: ${topPath.name}`,
      detail: `${pct}% ของผู้เล่นเลือก path นี้ — เหมาะสำหรับทำเนื้อหาเพิ่ม`,
    });
  }

  // ── 5. Result type insight ──
  const topResult = topItem(resultDistribution);
  if (topResult && resultDistribution.length > 0) {
    const totalResults = resultDistribution.reduce((s, r) => s + r.value, 0);
    const pct = totalResults > 0 ? Math.round((topResult.value / totalResults) * 100) : 0;
    insights.push({
      id: 'result_dominant', type: 'result', severity: 'info',
      finding: `ผลลัพธ์ "${topResult.name}" เกิดขึ้นบ่อยสุด (${pct}%)`,
      meaning: 'สะท้อนว่าผู้ใช้ส่วนใหญ่อยู่ในกลุ่มนี้ ควรออกแบบ follow-up ตาม',
      action: 'เพิ่ม soft CTA สำหรับกลุ่มผลลัพธ์นี้โดยเฉพาะ',
    });
    contentOpportunities.push({
      label: `ผลลัพธ์หลัก: ${topResult.name}`,
      detail: `ควรเอาไปทำ content / campaign เจาะกลุ่มนี้ต่อ`,
    });
  }

  // ── 6. Replay / curiosity insight ──
  const replayRatio = totalStarts > 0 ? replayCount / totalStarts : 0;
  if (replayRatio > THRESHOLDS.REPLAY_HIGH_RATIO) {
    insights.push({
      id: 'replay_high', type: 'replay', severity: 'success',
      finding: `อัตราเล่นซ้ำสูง (${replayCount} ครั้ง, ${Math.round(replayRatio * 100)}% ของ starts)`,
      meaning: 'เนื้อหามีความน่าสนใจสูง ผู้ใช้อยากลองเลือกทางอื่น',
      action: 'ใช้เป็น signal ว่าควรเพิ่ม episode / path ใหม่',
    });
    flags.push({ type: 'high_replay', label: 'High Replay', severity: 'success', detail: `${Math.round(replayRatio * 100)}%` });
  } else if (replayCount > 0) {
    insights.push({
      id: 'replay_ok', type: 'replay', severity: 'info',
      finding: `มีผู้เล่นซ้ำ ${replayCount} ครั้ง`,
      meaning: 'แสดงถึง engagement ระดับปานกลาง',
      action: 'ติดตามแนวโน้มต่อ',
    });
  }

  // ── Best CTA opportunity ──
  const bestCta = topItem(ctaClicks);
  if (bestCta) {
    contentOpportunities.push({
      label: `CTA ที่ perform ดีสุด: ${bestCta.name}`,
      detail: `${bestCta.value} clicks — ควรรักษา copy นี้และทดลองใช้กับ episode อื่น`,
    });
  }

  // ── Executive Summary ──
  const summary = generateExecutiveSummary(stats, insights, flags);

  // ── Top actions ──
  if (!actions.length) {
    if (completionRate < THRESHOLDS.COMPLETION_STRONG) actions.push('ปรับเนื้อหาให้กระชับเพื่อเพิ่มอัตราเล่นจบ');
    if (totalCta === 0) actions.push('ตรวจสอบและปรับ CTA ให้ชัดเจนขึ้น');
    actions.push('แชร์ลิงก์เพิ่มเติมเพื่อขยายกลุ่มเป้าหมาย');
  }

  // ── CSV summary row ──
  const csvSummary: Record<string, string> = {
    generated_summary: summary.whatHappened,
    top_flag: flags[0]?.label || 'none',
    top_recommendation: actions[0] || 'none',
    top_scene_dropoff: spike?.scene || 'none',
    best_cta: bestCta?.name || 'none',
    dominant_result: topResult?.name || 'none',
    completion_rate: `${completionRate}%`,
    total_starts: String(totalStarts),
  };

  return { summary, insights, flags, actions, contentOpportunities, isLimited, csvSummary };
}

function generateExecutiveSummary(stats: StatsInput, insights: Insight[], flags: InsightFlag[]): ExecutiveSummary {
  const { totalStarts, totalCompletions, completionRate, replayCount } = stats;
  const totalCta = totalCtaClicks(stats.ctaClicks);

  if (totalStarts < THRESHOLDS.MIN_SAMPLE) {
    return {
      whatHappened: `เริ่มมีสัญญาณเบื้องต้น — ${totalStarts} sessions, ${totalCompletions} เล่นจบ`,
      whatItMeans: 'ข้อมูลยังมีไม่มากพอสำหรับสรุปแนวโน้มที่ชัดเจน ควรเก็บข้อมูลเพิ่ม',
      recommendedAction: 'แชร์ Virtual Stories ให้กลุ่มเป้าหมายเพิ่มเติมก่อนสรุปผล',
    };
  }

  const dangerFlags = flags.filter(f => f.severity === 'danger');
  const warningFlags = flags.filter(f => f.severity === 'warning');

  let whatHappened = `มีผู้เริ่มเล่น ${totalStarts} ครั้ง เล่นจบ ${totalCompletions} ครั้ง (${completionRate}%)`;
  if (replayCount > 0) whatHappened += ` เล่นซ้ำ ${replayCount} ครั้ง`;
  if (totalCta > 0) whatHappened += ` CTA clicks ${totalCta} ครั้ง`;

  let whatItMeans: string;
  if (dangerFlags.length > 0) {
    whatItMeans = `พบสัญญาณที่ต้องแก้ไข: ${dangerFlags.map(f => f.detail).join(', ')}`;
  } else if (warningFlags.length > 0) {
    whatItMeans = `ภาพรวมดี แต่มีจุดที่ควรปรับ: ${warningFlags.map(f => f.detail).join(', ')}`;
  } else {
    whatItMeans = 'ภาพรวมอยู่ในเกณฑ์ดี ผู้ใช้ engage กับเนื้อหาและ CTA ได้ดี';
  }

  const topAction = insights.find(i => i.severity === 'danger' || i.severity === 'warning');
  const recommendedAction = topAction?.action || 'รักษาประสิทธิภาพเดิม และทดลองเพิ่ม episode ใหม่';

  return { whatHappened, whatItMeans, recommendedAction };
}
