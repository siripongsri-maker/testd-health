import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { ArrowLeft, Pill, Clock, Shield, TestTube, Heart } from "lucide-react";

const articleContent: Record<string, { icon: typeof Pill; contentTh: string; contentEn: string }> = {
  "what-is-prep": {
    icon: Pill,
    contentTh: `PrEP (Pre-Exposure Prophylaxis) คือยาที่คนที่ยังไม่ติดเชื้อ HIV กินเพื่อลดความเสี่ยงในการติดเชื้อ

เมื่อกินอย่างสม่ำเสมอ PrEP ลดความเสี่ยงในการติดเชื้อ HIV จากการมีเพศสัมพันธ์ได้ประมาณ 99%

ใครควรพิจารณาใช้ PrEP?
• คนที่มีคู่นอนติดเชื้อ HIV
• คนที่ไม่ได้ใช้ถุงยางอนามัยทุกครั้ง
• คนที่เคยติดโรคติดต่อทางเพศสัมพันธ์ในช่วง 6 เดือนที่ผ่านมา

พูดคุยกับผู้ให้บริการด้านสุขภาพเพื่อดูว่า PrEP เหมาะกับคุณหรือไม่`,
    contentEn: `PrEP (Pre-Exposure Prophylaxis) is medication taken by HIV-negative people to reduce the risk of getting HIV.

When taken consistently, PrEP reduces the risk of getting HIV from sex by about 99%.

Who should consider PrEP?
• People with HIV-positive partners
• People who don't always use condoms
• People who have had an STI in the past 6 months

Talk to a healthcare provider to see if PrEP is right for you.`,
  },
  "daily-vs-ondemand": {
    icon: Clock,
    contentTh: `มีสองวิธีในการกิน PrEP: รายวันและตามเหตุการณ์ (2-1-1)

PrEP รายวัน
• กินหนึ่งเม็ดทุกวันในเวลาเดียวกัน
• ให้การป้องกันหลังจากใช้สม่ำเสมอประมาณ 7 วัน
• เหมาะสำหรับคนที่มีเพศสัมพันธ์บ่อย

PrEP ตามเหตุการณ์ (2-1-1)
• กิน 2 เม็ด 2-24 ชั่วโมงก่อนมีเพศสัมพันธ์
• กิน 1 เม็ด 24 ชั่วโมงหลังจากยาโด๊สแรก
• กิน 1 เม็ด 48 ชั่วโมงหลังจากยาโด๊สแรก

ทั้งสองวิธีมีประสิทธิภาพสูงเมื่อกินอย่างถูกต้อง`,
    contentEn: `There are two ways to take PrEP: daily and on-demand (2-1-1).

Daily PrEP
• Take one pill every day at the same time
• Provides protection after about 7 days of consistent use
• Good for people who have sex regularly

On-demand PrEP (2-1-1)
• Take 2 pills 2-24 hours before sex
• Take 1 pill 24 hours after the first dose
• Take 1 pill 48 hours after the first dose

Both methods are highly effective when taken correctly.`,
  },
  "what-is-pep": {
    icon: Shield,
    contentTh: `PEP (Post-Exposure Prophylaxis) คือยาฉุกเฉินที่กินหลังจากอาจสัมผัสเชื้อ HIV เพื่อป้องกันการติดเชื้อ

ประเด็นสำคัญ
• ต้องเริ่มภายใน 72 ชั่วโมงหลังสัมผัสเชื้อ
• ยิ่งเริ่มเร็วเท่าไหร่ยิ่งดี
• ต้องกินต่อเนื่อง 28 วัน

เมื่อไหร่ที่อาจต้องใช้ PEP?
• มีเพศสัมพันธ์โดยไม่ใช้ถุงยางกับคนที่อาจติดเชื้อ HIV
• ถุงยางแตกระหว่างมีเพศสัมพันธ์
• ถูกล่วงละเมิดทางเพศ`,
    contentEn: `PEP (Post-Exposure Prophylaxis) is emergency medication taken after potential HIV exposure to prevent infection.

Key Points
• Must be started within 72 hours of exposure
• The sooner you start, the better it works
• Must be taken for 28 days

When might you need PEP?
• Condomless sex with someone who may have HIV
• Condom broke during sex
• Sexual assault`,
  },
  "hiv-testing": {
    icon: TestTube,
    contentTh: `การตรวจ HIV เป็นประจำเป็นส่วนสำคัญในการดูแลสุขภาพ

คำแนะนำการตรวจ

ถ้าคุณใช้ PrEP:
• ตรวจทุก 3 เดือน

ถ้าคุณมีกิจกรรมทางเพศ:
• ตรวจอย่างน้อยปีละครั้ง
• บ่อยขึ้นถ้ามีคู่นอนหลายคน

จำไว้: การตรวจพบเร็วหมายถึงการรักษาเร็ว ไม่มีอะไรน่าอายในการตรวจเป็นประจำ`,
    contentEn: `Regular HIV testing is an important part of staying healthy.

Testing Recommendations

If you're on PrEP:
• Test every 3 months

If you're sexually active:
• Test at least once a year
• More often if you have multiple partners

Remember: Early detection means early treatment. There's no shame in testing regularly.`,
  },
  "condoms-harm-reduction": {
    icon: Heart,
    contentTh: `การใช้หลายวิธีป้องกันร่วมกันให้การปกป้องที่ดีที่สุด

ถุงยางอนามัย
• ป้องกัน HIV และโรคติดต่อทางเพศสัมพันธ์อื่นๆ
• ป้องกันการตั้งครรภ์ด้วย
• ใช้สารหล่อลื่นแบบน้ำหรือซิลิโคน

การรวมวิธี
• PrEP + ถุงยาง = การป้องกันสูงสุด
• ลดความเสี่ยงโรคติดต่อทางเพศทั้งหมด ไม่ใช่แค่ HIV

จำไว้
• ที่นี่ไม่มีการตัดสิน
• การป้องกันใดๆ ก็ดีกว่าไม่มีเลย`,
    contentEn: `Using multiple prevention methods together provides the best protection.

Condoms
• Protect against HIV and other STIs
• Also prevent pregnancy
• Use water-based or silicone-based lube

Combining Methods
• PrEP + condoms = maximum protection
• Reduces risk of all STIs, not just HIV

Remember
• There's no judgment here
• Any protection is better than none`,
  },
};

export default function InfoArticle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  
  const article = id ? articleContent[id] : null;
  
  if (!article) {
    return (
      <>
        <PageContainer>
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('info.noResults')}</p>
            <Button variant="link" onClick={() => navigate("/info")}>{t('common.back')}</Button>
          </div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }
  
  const Icon = article.icon;
  const content = language === 'th' ? article.contentTh : article.contentEn;

  return (
    <>
      <PageContainer>
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/info")}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </div>
        
        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-primary shadow-soft">
            <Icon className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>
        
        <div className="animate-slide-up">
          <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
            <div className="prose prose-sm max-w-none">
              {content.split("\n\n").map((paragraph, index) => {
                if (paragraph.startsWith("•")) {
                  return (
                    <ul key={index} className="space-y-2 my-4">
                      {paragraph.split("\n").map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span>{item.replace("• ", "")}</span>
                        </li>
                      ))}
                    </ul>
                  );
                }
                return <p key={index} className="text-foreground leading-relaxed mb-4">{paragraph}</p>;
              })}
            </div>
          </div>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
