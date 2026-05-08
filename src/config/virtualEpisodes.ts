// Central registry for all Virtual episodes / mini-games.
// Both the homepage carousel and /virtual page consume this list.
// Sort by publishedAt DESC for "newest first" display.

export type VirtualEpisodeKind = 'story' | 'game';

export interface VirtualEpisode {
  /** URL slug — used at /virtual/[slug] */
  slug: string;
  kind: VirtualEpisodeKind;
  emoji: string;
  badgeIcon?: string;
  badge: string;
  /** ISO date string — controls sort order (newest first) */
  publishedAt: string;
  /** Show NEW badge if true */
  isNew?: boolean;
  duration: string;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  tags: string[];
  /** HSL accent color */
  accent: string;
  /** Static external HTML (loaded inside iframe). If undefined, we render the React view. */
  staticHtml?: string;
}

export const VIRTUAL_EPISODES: VirtualEpisode[] = [
  {
    slug: 'prep-fortune',
    kind: 'game',
    emoji: '🔮',
    badge: '🔮 NEW GAME',
    publishedAt: '2026-05-08',
    isNew: true,
    duration: '2 นาที',
    titleTh: 'ดวงโดน PrEP (ซินแสไซเบอร์)',
    titleEn: 'PrEP Fortune (Cyber Saju)',
    descTh: 'ดูดวงสนุกๆ ผูกวันเกิด+เวลาตกฟาก',
    descEn: 'Fun fortune-telling tied to your birth date',
    tags: ['Saju', 'Fortune'],
    accent: 'hsl(0, 72%, 51%)',
  },
  {
    slug: 'prep-boys',
    kind: 'game',
    emoji: '💕',
    badge: '🎮 NEW EPISODE',
    publishedAt: '2026-05-07',
    isNew: true,
    duration: '5 นาที',
    titleTh: 'PrEP Boys: เลือกหนุ่มในฝัน',
    titleEn: 'PrEP Boys: Pick Your Crush',
    descTh: 'จีบหนุ่ม 4 สไตล์ แล้วหา PrEP ที่เหมาะกับเขา',
    descEn: 'Date 4 guys & match the right PrEP',
    tags: ['Dating Sim', 'PrEP Match'],
    accent: 'hsl(333, 80%, 62%)',
    staticHtml: '/virtual/prep-boys/index.html',
  },
  {
    slug: 'prep-hunt',
    kind: 'game',
    emoji: '💊',
    badge: '🎮 GAME',
    publishedAt: '2026-03-15',
    duration: '3 นาที',
    titleTh: 'หา PrEP ให้เจอ!',
    titleEn: 'Find the PrEP!',
    descTh: 'เกมสั้นเรียนรู้เรื่อง PrEP',
    descEn: 'Quick game about PrEP adherence',
    tags: ['Interactive', '3 นาที'],
    accent: 'hsl(280, 70%, 60%)',
  },
  {
    slug: 'ep2',
    kind: 'story',
    emoji: '💉',
    badge: 'EPISODE 2',
    publishedAt: '2026-02-20',
    isNew: true,
    duration: '5 นาที',
    titleTh: 'เข็มที่เขายังไม่รู้ว่ามี',
    titleEn: "The Shot He Didn't Know",
    descTh: 'PrEP และทางเลือกใหม่อย่าง Lenacapavir',
    descEn: 'PrEP & Lenacapavir',
    tags: ['PrEP', 'Lenacapavir'],
    accent: 'hsl(200, 85%, 55%)',
  },
  {
    slug: 'ep1',
    kind: 'story',
    emoji: '🌙',
    badge: 'EPISODE 1',
    publishedAt: '2026-01-10',
    duration: '5 นาที',
    titleTh: 'คืนที่ไม่มีใครเตือน',
    titleEn: 'The Night No One Warned',
    descTh: 'การเดท ความยินยอม และการดูแลตัวเอง',
    descEn: 'Dating, consent & self-care',
    tags: ['Date Safety', 'Consent'],
    accent: 'hsl(333, 71%, 50%)',
  },
];

/** Sorted newest first */
export function getVirtualEpisodesSorted(): VirtualEpisode[] {
  return [...VIRTUAL_EPISODES].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getEpisodeBySlug(slug: string | undefined | null): VirtualEpisode | undefined {
  if (!slug) return undefined;
  return VIRTUAL_EPISODES.find((e) => e.slug === slug);
}
