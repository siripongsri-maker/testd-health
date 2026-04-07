export interface FunnelCounts {
  bookingClicks: number;
  selftestClicks: number;
  supportClicks: number;
  stickyClicks: number;
  pageViewBooking: number;
  pageViewSelftest: number;
  bookingStarted: number;
  bookingSubmitted: number;
  selftestStarted: number;
  selftestSubmitted: number;
}

export interface ConversionRates {
  bookingClickToView: number;
  bookingViewToStart: number;
  bookingStartToSubmit: number;
  bookingOverall: number;
  selftestClickToView: number;
  selftestViewToStart: number;
  selftestStartToSubmit: number;
  selftestOverall: number;
}

export type InsightSeverity = 'warning' | 'success' | 'info';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  action: string;
}

function rate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function computeRates(c: FunnelCounts): ConversionRates {
  return {
    bookingClickToView: rate(c.pageViewBooking, c.bookingClicks),
    bookingViewToStart: rate(c.bookingStarted, c.pageViewBooking),
    bookingStartToSubmit: rate(c.bookingSubmitted, c.bookingStarted),
    bookingOverall: rate(c.bookingSubmitted, c.bookingClicks),
    selftestClickToView: rate(c.pageViewSelftest, c.selftestClicks),
    selftestViewToStart: rate(c.selftestStarted, c.pageViewSelftest),
    selftestStartToSubmit: rate(c.selftestSubmitted, c.selftestStarted),
    selftestOverall: rate(c.selftestSubmitted, c.selftestClicks),
  };
}

export function generateInsights(c: FunnelCounts, r: ConversionRates): Insight[] {
  const insights: Insight[] = [];

  const totalClicks = c.bookingClicks + c.selftestClicks + c.supportClicks + c.stickyClicks;

  if (totalClicks === 0) return [];

  // Booking funnel
  if (c.bookingClicks > 0 && c.bookingStarted === 0) {
    insights.push({
      id: 'booking-no-start',
      severity: 'warning',
      title: 'คลิก Booking แต่ไม่มีใครเริ่มจอง',
      description: `มีคนคลิก CTA จอง ${c.bookingClicks} ครั้ง แต่ไม่มีใครเริ่มกรอกฟอร์ม`,
      action: 'ตรวจสอบหน้า Booking ว่า UX ชัดเจนหรือไม่ หรือมีอุปสรรคก่อนเริ่มจอง',
    });
  } else if (c.bookingStarted > 0 && r.bookingStartToSubmit < 50) {
    insights.push({
      id: 'booking-drop-off',
      severity: 'warning',
      title: 'Drop-off สูงในขั้นตอน Booking',
      description: `เริ่มจอง ${c.bookingStarted} ครั้ง แต่ส่งสำเร็จ ${c.bookingSubmitted} (${r.bookingStartToSubmit}%)`,
      action: 'ลดขั้นตอนฟอร์ม หรือเพิ่มข้อความให้มั่นใจว่าบริการฟรีและเป็นส่วนตัว',
    });
  } else if (r.bookingStartToSubmit >= 70) {
    insights.push({
      id: 'booking-strong',
      severity: 'success',
      title: 'Booking Funnel แข็งแรง',
      description: `อัตราสำเร็จ ${r.bookingStartToSubmit}% — ผู้ใช้ที่เริ่มจองส่วนใหญ่ทำสำเร็จ`,
      action: 'รักษา flow นี้ไว้ และเพิ่มการดึงคนเข้ามาที่หน้า Booking',
    });
  }

  // Self-test funnel
  if (c.selftestClicks > 0 && c.selftestStarted === 0) {
    insights.push({
      id: 'selftest-no-start',
      severity: 'warning',
      title: 'คลิก Self-test แต่ไม่มีใครเริ่มกรอก',
      description: `มีคนคลิก CTA ชุดตรวจ ${c.selftestClicks} ครั้ง แต่ไม่มีใครเริ่มกรอกข้อมูล`,
      action: 'ตรวจสอบว่าหน้า Self-test เข้าใจง่ายหรือไม่ ลองเพิ่ม trust signal',
    });
  } else if (c.selftestStarted > 0 && r.selftestStartToSubmit < 50) {
    insights.push({
      id: 'selftest-drop-off',
      severity: 'warning',
      title: 'Drop-off สูงในขั้นตอน Self-test',
      description: `เริ่มกรอก ${c.selftestStarted} ครั้ง แต่ส่งสำเร็จ ${c.selftestSubmitted} (${r.selftestStartToSubmit}%)`,
      action: 'ลดจำนวนข้อมูลที่ต้องกรอก หรือเพิ่มข้อความว่า "ข้อมูลของคุณจะถูกเก็บเป็นความลับ"',
    });
  } else if (r.selftestStartToSubmit >= 70) {
    insights.push({
      id: 'selftest-strong',
      severity: 'success',
      title: 'Self-test Funnel แข็งแรง',
      description: `อัตราสำเร็จ ${r.selftestStartToSubmit}% — ผู้ใช้ส่วนใหญ่กรอกข้อมูลจนจบ`,
      action: 'เพิ่มช่องทางดึงคนเข้ามาที่หน้า Self-test เช่น social media, outreach',
    });
  }

  // Support interest
  if (c.supportClicks > 0) {
    insights.push({
      id: 'support-interest',
      severity: 'info',
      title: 'มีความสนใจขอคำปรึกษา',
      description: `คลิก CTA ปรึกษาเจ้าหน้าที่ ${c.supportClicks} ครั้ง`,
      action: 'ตรวจสอบว่าทีมพร้อมรับ chat หรือไม่ และตอบกลับเร็วแค่ไหน',
    });
  }

  // Sticky CTA
  if (c.stickyClicks > 5) {
    insights.push({
      id: 'sticky-effective',
      severity: 'info',
      title: 'ปุ่ม Sticky CTA ถูกใช้งาน',
      description: `ปุ่มลอยด้านล่างถูกคลิก ${c.stickyClicks} ครั้ง`,
      action: 'Sticky CTA ช่วยดึง conversion — คงไว้และทดลองเปลี่ยนข้อความ',
    });
  }

  // Overall comparison
  if (c.selftestClicks > c.bookingClicks * 2 && c.selftestClicks > 5) {
    insights.push({
      id: 'selftest-preferred',
      severity: 'info',
      title: 'ผู้ใช้สนใจ Self-test มากกว่า Booking',
      description: `คลิก Self-test ${c.selftestClicks} vs Booking ${c.bookingClicks}`,
      action: 'พิจารณาเน้น Self-test เป็น primary CTA หรือเพิ่มสต็อกชุดตรวจ',
    });
  }

  return insights;
}
