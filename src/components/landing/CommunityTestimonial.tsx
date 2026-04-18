import { useLanguage } from "@/lib/i18n";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    textTh: "ใช้งานง่ายมาก ได้รับชุดตรวจภายใน 2 วัน รู้สึกอุ่นใจที่มีคนดูแล",
    textEn: "So easy to use! Got my test kit in 2 days. Felt supported the whole way.",
    authorTh: "ผู้ใช้ กรุงเทพฯ",
    authorEn: "User from Bangkok",
  },
  {
    textTh: "ไม่เคยคิดว่าจะกล้าตรวจ HIV แต่แอพนี้ทำให้รู้สึกปลอดภัย",
    textEn: "Never thought I'd have the courage to test. This app made it feel safe.",
    authorTh: "ผู้ใช้ เชียงใหม่",
    authorEn: "User from Chiang Mai",
  },
  {
    textTh: "ชอบที่เป็นความลับ ไม่ต้องไปคลินิก ตรวจได้เองที่บ้าน",
    textEn: "Love the privacy. No clinic visits. Test at home on my own terms.",
    authorTh: "ผู้ใช้ ภูเก็ต",
    authorEn: "User from Phuket",
  },
];

export function CommunityTestimonial() {
  const { language } = useLanguage();
  
  // Pick a random testimonial on each render
  const testimonial = testimonials[Math.floor(Math.random() * testimonials.length)];

  return (
    <div className="relative px-4 py-5 rounded-2xl bg-gradient-to-br from-primary/5 via-accent/5 to-success/5 border border-border/30">
      {/* Quote icon */}
      <Quote className="absolute top-3 left-3 h-5 w-5 text-primary/30" />
      
      {/* Stars */}
      <div className="flex gap-0.5 mb-2 justify-center">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />
        ))}
      </div>

      {/* Testimonial text */}
      <p className="text-sm text-foreground/90 text-center leading-relaxed mb-2 italic">
        "{language === "th" ? testimonial.textTh : testimonial.textEn}"
      </p>

      <p className="text-xs text-muted-foreground text-center">
        {language === "th" ? testimonial.authorTh : testimonial.authorEn}
      </p>
    </div>
  );
}
