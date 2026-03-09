import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';
import {
  TestTube,
  Calendar,
  Users,
  ClipboardList,
  BookOpen,
  Heart,
  MessageCircle,
  Headphones,
} from 'lucide-react';
import { MedicationTrackerWidget } from './MedicationTrackerWidget';

interface MenuCardProps {
  icon: React.ReactNode;
  titleTh: string;
  titleEn: string;
  onClick: () => void;
  variant?: 'default' | 'featured';
}

function MenuCard({ icon, titleTh, titleEn, onClick, variant = 'default' }: MenuCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full aspect-square rounded-2xl sm:rounded-3xl 
        glass glass-shine hover:shadow-soft
        transition-all duration-300 
        hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98]
        flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3
        ${variant === 'featured' ? 'ring-2 ring-primary/30' : ''}
      `}
    >
      <div className="h-10 w-10 sm:h-14 md:h-16 sm:w-14 md:w-16 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <div className="text-center space-y-0">
        <p className="text-xs sm:text-sm font-bold text-foreground leading-tight">{titleTh}</p>
        {titleEn && (
          <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">{titleEn}</p>
        )}
      </div>
    </button>
  );
}

// Row section label
function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1 mt-4 mb-1.5">
      {children}
    </p>
  );
}

export function HomeActionGrid() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  // Row 1 — Primary Health Actions
  const row1 = [
    {
      icon: <TestTube className="h-full w-full" strokeWidth={1.5} />,
      titleKey: 'home.selfTest',
      path: '/hiv-selftest',
    },
    {
      icon: <Calendar className="h-full w-full" strokeWidth={1.5} />,
      titleKey: 'home.bookAppointment',
      path: '/booking',
    },
    {
      icon: <Users className="h-full w-full" strokeWidth={1.5} />,
      titleKey: 'home.inviteTest',
      path: '/invite',
    },
  ];

  // Row 2 — Learning & Self Assessment
  const row2 = [
    {
      icon: <ClipboardList className="h-full w-full" strokeWidth={1.5} />,
      titleKey: 'home.surveys',
      path: '/surveys',
    },
    {
      icon: <BookOpen className="h-full w-full" strokeWidth={1.5} />,
      titleKey: 'home.didYouKnow',
      path: '/info',
    },
    {
      icon: <Heart className="h-full w-full" strokeWidth={1.5} />,
      titleKey: 'home.selfCare',
      path: '/self-care',
    },
  ];

  // Row 3 — Support (counselor + wide medication widget)
  const row3Counselor = {
    icon: <MessageCircle className="h-full w-full" strokeWidth={1.5} />,
    titleKey: 'home.onlineCounselor',
    path: '/community',
  };

  return (
    <div className="space-y-0">
      {/* Row 1 */}
      <RowLabel>
        {language === 'th' ? '🩺 บริการตรวจ' : '🩺 Testing Services'}
      </RowLabel>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {row1.map((item, i) => (
          <MenuCard
            key={i}
            icon={item.icon}
            titleTh={t(item.titleKey)}
            titleEn=""
            onClick={() => navigate(item.path)}
            variant={i === 0 ? 'featured' : 'default'}
          />
        ))}
      </div>

      {/* Row 2 */}
      <RowLabel>
        {language === 'th' ? '📚 เรียนรู้ & ประเมิน' : '📚 Learn & Assess'}
      </RowLabel>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {row2.map((item, i) => (
          <MenuCard
            key={i}
            icon={item.icon}
            titleTh={t(item.titleKey)}
            titleEn=""
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>

      {/* Row 3 */}
      <RowLabel>
        {language === 'th' ? '💬 สนับสนุน & ยา' : '💬 Support & Medication'}
      </RowLabel>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MenuCard
          icon={row3Counselor.icon}
          titleTh={t(row3Counselor.titleKey)}
          titleEn=""
          onClick={() => navigate(row3Counselor.path)}
        />
        {/* Wide medication widget spanning 2 columns */}
        <div className="col-span-2">
          <MedicationTrackerWidget />
        </div>
      </div>
    </div>
  );
}
