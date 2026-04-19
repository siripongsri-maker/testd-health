import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';

import consultImg from '@/assets/menu/consult.png';
import selftestImg from '@/assets/menu/selftest.png';
import riskImg from '@/assets/menu/risk.png';
import inviteImg from '@/assets/menu/invite.png';
import learnImg from '@/assets/menu/learn.png';
import selfcare1Img from '@/assets/menu/selfcare1.png';
import selfcare2Img from '@/assets/menu/selfcare2.png';
import harmReductionImg from '@/assets/menu/harmreduction.png';

type MenuItem = {
  img: string;
  labelTh: string;
  labelEn: string;
  path: string;
  tint: string;
};

const items: MenuItem[] = [
  {
    img: consultImg,
    labelTh: 'ขอคำปรึกษา',
    labelEn: 'Get advice',
    path: '/support-chat',
    tint: 'from-rose-100/60 to-orange-50/40',
  },
  {
    img: selftestImg,
    labelTh: 'ชุดตรวจถึงบ้าน',
    labelEn: 'HIV self-test',
    path: '/hiv-selftest',
    tint: 'from-teal-100/60 to-emerald-50/40',
  },
  {
    img: riskImg,
    labelTh: 'ประเมินความเสี่ยง',
    labelEn: 'Risk check',
    path: '/surveys',
    tint: 'from-amber-100/60 to-yellow-50/40',
  },
  {
    img: inviteImg,
    labelTh: 'ชวนเพื่อนตรวจ',
    labelEn: 'Invite a friend',
    path: '/invite',
    tint: 'from-pink-100/60 to-rose-50/40',
  },
  {
    img: learnImg,
    labelTh: 'เรื่องน่ารู้',
    labelEn: 'Learn more',
    path: '/info',
    tint: 'from-orange-100/60 to-amber-50/40',
  },
  {
    img: selfcare1Img,
    labelTh: 'ดูแลตัวเอง',
    labelEn: 'Self-care',
    path: '/self-care',
    tint: 'from-emerald-100/60 to-teal-50/40',
  },
  {
    img: selfcare2Img,
    labelTh: 'วิธีป้องกันที่ใช่',
    labelEn: 'Find your match',
    path: '/prevention-match',
    tint: 'from-sky-100/60 to-cyan-50/40',
  },
  {
    img: harmReductionImg,
    labelTh: 'Harm Reduction',
    labelEn: 'Harm Reduction',
    path: '/harm-reduction',
    tint: 'from-violet-100/60 to-purple-50/40',
  },
];

export function HomeMenuGrid() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isTh = language === 'th';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {items.map((item) => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          aria-label={isTh ? item.labelTh : item.labelEn}
          className="group flex flex-col items-center text-center rounded-3xl bg-card/70 backdrop-blur-sm border border-border/40 shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 overflow-hidden p-2.5 sm:p-3"
        >
          <div
            className={`relative w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br ${item.tint}`}
          >
            <img
              src={item.img}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
            />
          </div>
          <span className="mt-2.5 text-[13px] sm:text-sm font-medium text-foreground leading-tight px-1 pb-1">
            {isTh ? item.labelTh : item.labelEn}
          </span>
        </button>
      ))}
    </div>
  );
}
