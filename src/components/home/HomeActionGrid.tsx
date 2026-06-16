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
  Sparkles,
  ShieldHalf,
  ChevronRight,
} from 'lucide-react';
import { MedicationTrackerWidget } from './MedicationTrackerWidget';

interface ServiceItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function ServiceItem({ icon, label, onClick }: ServiceItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-card/80 border border-border/30 hover:bg-accent/50 hover:border-primary/20 transition-all duration-200 active:scale-[0.98] group"
    >
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary group-hover:bg-primary/15 transition-colors">
        {icon}
      </div>
      <span className="text-sm font-medium text-foreground flex-1 text-left truncate">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
    </button>
  );
}

export function HomeActionGrid() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const isEn = language === 'en';

  const services = [
    {
      icon: <ClipboardList className="h-4 w-4" />,
      label: isEn ? 'Self-Assessment' : 'แบบประเมิน',
      path: '/surveys',
    },
    {
      icon: <BookOpen className="h-4 w-4" />,
      label: isEn ? 'Health Info' : 'เรื่องน่ารู้',
      path: '/info',
    },
    {
      icon: <Heart className="h-4 w-4" />,
      label: isEn ? 'Self-Care' : 'ดูแลตัวเอง',
      path: '/self-care',
    },
    {
      icon: <Sparkles className="h-4 w-4" />,
      label: isEn ? 'Prevention Match' : 'วิธีป้องกันที่ใช่',
      path: '/prevention-match',
    },
    {
      icon: <ShieldHalf className="h-4 w-4" />,
      label: 'Harm Reduction',
      path: '/harm-reduction',
    },
  ];

  const support = [
    {
      icon: <MessageCircle className="h-4 w-4" />,
      label: isEn ? 'Online Counselor' : 'ขอคำปรึกษา',
      path: 'https://line.me/R/ti/p/@swingthailand',
      external: true,
    },
    {
      icon: <Headphones className="h-4 w-4" />,
      label: isEn ? 'Contact Admin' : 'ติดต่อแอดมิน',
      path: '/support-chat',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Services list */}
      <div className="space-y-1.5">
        {services.map((item, i) => (
          <ServiceItem
            key={i}
            icon={item.icon}
            label={item.label}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>

      {/* Support & Medication */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1 mb-2">
          {isEn ? '💬 Support & Medication' : '💬 สนับสนุน & ยา'}
        </p>
        <div className="space-y-1.5">
          {support.map((item, i) => (
            <ServiceItem
              key={i}
              icon={item.icon}
              label={item.label}
              onClick={() => navigate(item.path)}
            />
          ))}
          <MedicationTrackerWidget />
        </div>
      </div>
    </div>
  );
}
