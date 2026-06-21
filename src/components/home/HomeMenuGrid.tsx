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
  /** i18n key — labels live centrally in src/lib/i18n.ts under `home.menu.*` */
  labelKey: string;
  path: string;
  tint: string;
};

const items: MenuItem[] = [
  {
    img: consultImg,
    labelKey: 'home.menu.consult',
    path: 'https://line.me/R/ti/p/@swingthailand',
    tint: 'from-rose-100/60 to-orange-50/40',
  },
  {
    img: selftestImg,
    labelKey: 'home.menu.selftest',
    path: '/hiv-selftest',
    tint: 'from-teal-100/60 to-emerald-50/40',
  },
  {
    img: riskImg,
    labelKey: 'home.menu.risk',
    path: '/surveys',
    tint: 'from-amber-100/60 to-yellow-50/40',
  },
  {
    img: inviteImg,
    labelKey: 'home.menu.invite',
    path: '/invite',
    tint: 'from-pink-100/60 to-rose-50/40',
  },
  {
    img: learnImg,
    labelKey: 'home.menu.learn',
    path: '/info',
    tint: 'from-orange-100/60 to-amber-50/40',
  },
  {
    img: selfcare1Img,
    labelKey: 'home.menu.selfcare',
    path: '/self-care',
    tint: 'from-emerald-100/60 to-teal-50/40',
  },
  {
    img: selfcare2Img,
    labelKey: 'home.menu.preventionMatch',
    path: '/prevention-match',
    tint: 'from-sky-100/60 to-cyan-50/40',
  },
  {
    img: harmReductionImg,
    labelKey: 'home.menu.harmReduction',
    path: '/harm-reduction',
    tint: 'from-violet-100/60 to-purple-50/40',
  },
];

export function HomeMenuGrid() {
  const navigate = useNavigate();
  const t = useLanguage((s) => s.t);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5">
      {items.map((item) => {
        const isExternal = /^https?:\/\//.test(item.path);
        const label = t(item.labelKey);
        return (
          <button
            key={item.path}
            onClick={() => {
              if (isExternal) {
                window.open(item.path, '_blank', 'noopener,noreferrer');
              } else {
                navigate(item.path);
              }
            }}
            aria-label={label}
            className="group flex flex-col items-center text-center rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 overflow-hidden p-1 sm:p-1.5"
          >
            <div
              className={`relative w-full aspect-square rounded-xl overflow-hidden bg-gradient-to-br ${item.tint}`}
            >
              <img
                src={item.img}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover scale-[1.08] group-hover:scale-[1.14] transition-transform duration-300"
              />
            </div>
            <span className="mt-1 sm:mt-1.5 text-[11px] sm:text-xs font-medium text-foreground/90 leading-tight px-0.5 pb-1">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
