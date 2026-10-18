/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { describe, expect, it } from "vitest";
import {
  clinicBookingHref,
  matchClinicService,
  normalizeForMatch,
} from "../articleBookingMatch";

/** Services hidden from the public clinic menu must never be routed to. */
const HIDDEN_SLUGS = [
  "sti-screening",
  "self-test-support",
  "mental-health-support",
  "harm-reduction-counseling",
];

describe("normalizeForMatch", () => {
  it("makes the phonetic spelling match the canonical one", () => {
    expect(normalizeForMatch("ซฟิลิส")).toBe(normalizeForMatch("ซิฟิลิส"));
  });

  it("matches the 72-hour phrase with or without the stray space", () => {
    const spaced = "ต้องได้รรับยา PEP ภายใน 72 ชั่ วโมง";
    const tight = "ต้องได้รรับยา PEP ภายใน 72 ชั่วโมง";
    expect(matchClinicService(spaced)?.slug).toBe("pep");
    expect(matchClinicService(tight)?.slug).toBe("pep");
  });
});

describe("matchClinicService", () => {
  it("sends an exposure article to the PEP consultation", () => {
    const match = matchClinicService(
      "ถ้ามีความเสี่ ยงมาล่าสุด ต้องได้รับยา PEP ภายใน 72 ชั่ วโมง ยิ่ งเร็ วยิ่ งดี"
    );
    expect(match?.slug).toBe("pep");
    expect(clinicBookingHref(match)).toBe("/clinic/book?service=pep");
  });

  it("sends a PrEP article to the PrEP consultation", () => {
    const match = matchClinicService(
      "อยากเริ่ ม PrEP ต้องทำอย่างไร จองนัดเพื่ อเร่ิมยาป้องกอน"
    );
    expect(match?.slug).toBe("prep-consultation");
    expect(clinicBookingHref(match)).toBe("/clinic/book?service=prep-consultation");
  });

  it("sends an HIV self-test article to HIV testing", () => {
    const match = matchClinicService(
      "ตรวจ HIV ด้วยชุดตรวจ ทำได้เองที่บ้าน รอ 20 นาทีก้อดผล"
    );
    expect(match?.slug).toBe("hiv-testing");
    expect(clinicBookingHref(match)).toBe("/clinic/book?service=hiv-testing");
  });

  it("recognises syphilis spelled the phonetic way", () => {
    const match = matchClinicService(
      "ซฟิลิส ขึ้ นมากในไทย แผลที่อวัยะไม่เจบ ก้อตรวจได้"
    );
    expect(match?.slug).toBe("syphilis-testing");
  });

  it("falls back to the plain booking page when nothing clinical matches", () => {
    const match = matchClinicService(
      "เรื่ องราวประจำวัน ทีกินเข่าทำมาหากิน ไม่เกี่ ยวกับสขุ ภาพ"
    );
    expect(match).toBeNull();
    expect(clinicBookingHref(match)).toBe("/clinic/book");
  });

  it("never routes to a service hidden from the public clinic menu", () => {
    const match = matchClinicService(
      "อยากตรวจโรคติดต่อทางเพศสัมพันธ์และรบั ผล"
    );
    expect(HIDDEN_SLUGS).not.toContain(match?.slug);
  });

  it("handles missing text without throwing", () => {
    expect(matchClinicService(null)).toBeNull();
    expect(matchClinicService("   ")).toBeNull();
    expect(clinicBookingHref(null)).toBe("/clinic/book");
  });
});
