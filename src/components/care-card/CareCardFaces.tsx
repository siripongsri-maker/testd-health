import { QRCodeSVG } from "qrcode.react";
import eltonImg from "@/assets/care-card/elton.svg";
import swingImg from "@/assets/care-card/swing.png";
import testdImg from "@/assets/care-card/testd.png";
import poppersImg from "@/assets/care-card/poppers.png";
import waiwaiImg from "@/assets/care-card/waiwai.png";
import "./careCard.css";

const S = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

const IconAlert = () => (
  <svg viewBox="0 0 24 24" {...S}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
);
const IconGlass = () => (
  <svg viewBox="0 0 24 24" {...S}><path d="M8 22h8" /><path d="M7 10h10" /><path d="M12 15v7" /><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-1-8H8c-.5 4-1 6-1 8a5 5 0 0 0 5 5Z" /></svg>
);
const IconPill = () => (
  <svg viewBox="0 0 24 24" {...S}><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></svg>
);
const IconUsers = () => (
  <svg viewBox="0 0 24 24" {...S}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const IconUserCheck = () => (
  <svg viewBox="0 0 24 24" {...S}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="m16 11 2 2 4-4" /></svg>
);
const IconTimer = () => (
  <svg viewBox="0 0 24 24" {...S}><path d="M10 2h4" /><path d="M12 14v-3" /><circle cx="12" cy="14" r="8" /></svg>
);
const IconDroplets = () => (
  <svg viewBox="0 0 24 24" {...S}><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" /><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" /></svg>
);
const IconDroplet = () => (
  <svg viewBox="0 0 24 24" {...S}><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" /></svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" {...S}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
);
const IconDoor = () => (
  <svg viewBox="0 0 24 24" {...S}><path d="M13 4h3a2 2 0 0 1 2 2v14" /><path d="M2 20h3" /><path d="M13 20h9" /><path d="M10 12v.01" /><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5.5 20.22a1 1 0 0 1-.5-.87V4.66a1 1 0 0 1 .757-.97l6-1.499A1 1 0 0 1 13 3.16z" /></svg>
);
const IconPhone = () => (
  <svg viewBox="0 0 24 24" {...S}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
);
const IconHeart = () => (
  <svg viewBox="0 0 24 24" {...S}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66" /><path d="m18 15-2-2" /><path d="m15 18-2-2" /></svg>
);

type ChipTone = "purple" | "blue" | "teal" | "yellow" | "pink";
const Row = ({ tone, icon, children }: { tone: ChipTone; icon: React.ReactNode; children: React.ReactNode }) => (
  <li><span className={`cc-chip cc-i-${tone}`}>{icon}</span><span>{children}</span></li>
);

/** หน้า 1 (ด้านหน้า) */
export function CareCardFront() {
  return (
    <div className="cc-card cc-front">
      <div className="cc-logos">
        <img className="cc-l-elton" src={eltonImg} alt="Elton John AIDS Foundation" />
        <span className="cc-sep" />
        <img className="cc-l-swing" src={swingImg} alt="SWING" />
        <span className="cc-sep" />
        <img className="cc-l-testd" src={testdImg} alt="testD" />
      </div>
      <div className="cc-body">
        <div className="cc-callout cc-alert">
          <IconAlert />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cc-pair">
              <figure><img src={poppersImg} alt="ยาดมเกย์" /><figcaption>ยาดมเกย์</figcaption></figure>
              <span className="cc-plus">+</span>
              <figure><img src={waiwaiImg} alt="ไวไว" /><figcaption>ไวไว</figcaption></figure>
            </div>
            <h2>ยาดมเกย์ + ไวไว ห้ามใช้พร้อมกัน</h2>
            <p>ความดันตก หน้ามืด ล้มได้</p>
          </div>
        </div>
        <ul className="cc-list">
          <Row tone="purple" icon={<IconGlass />}>เหล้าทำให้ไม่แข็ง พอไม่แข็งก็กินเพิ่ม แล้ววนไปเรื่อย ๆ</Row>
          <Row tone="blue" icon={<IconPill />}>ยาซื้อข้างนอกไม่รู้โดส แข็งค้างเกิน 4 ชั่วโมง ไปโรงพยาบาล</Row>
          <Row tone="teal" icon={<IconUsers />}>ถุง 1 อัน ต่อ 1 คน ไม่ใช้ซ้ำ</Row>
          <Row tone="yellow" icon={<IconTimer />}>ถุงยาง เปลี่ยนทุก ๆ 30 นาที</Row>
          <Row tone="blue" icon={<IconDroplets />}>เจลใช้เยอะ ๆ เติมเรื่อย ๆ</Row>
          <Row tone="pink" icon={<IconShield />}>ยาดมเกย์ทำให้ไม่เจ็บ แต่ไม่เจ็บไม่ได้แปลว่าไม่มีแผล</Row>
        </ul>
      </div>
    </div>
  );
}

/** หน้า 2 (ด้านหลัง) พร้อม QR code */
export function CareCardBack({ qrUrl, footerText }: { qrUrl: string; footerText?: string }) {
  return (
    <div className="cc-card cc-back">
      <div className="cc-body">
        <div className="cc-ph">
          <IconHeart />
          <h1>ดูแลกัน</h1>
          <span className="cc-pnum">หน้า 2</span>
        </div>
        <ul className="cc-list">
          <Row tone="teal" icon={<IconUserCheck />}>ให้มีคนที่ยังไหวอย่างน้อย 1 คน</Row>
          <Row tone="blue" icon={<IconDroplet />}>ดื่มน้ำเปล่า พักบ้าง</Row>
          <Row tone="yellow" icon={<IconDoor />}>อย่าอยู่คนเดียวในห้องปิด</Row>
        </ul>
        <div className="cc-callout cc-warn">
          <IconPhone />
          <div>
            <h2>เพื่อนเรียกไม่ตื่น</h2>
            <p>จับตะแคง เปิดทางลม โทร <strong>1669</strong><br />เรียกรถพยาบาลไม่มีใครโดนจับ</p>
          </div>
        </div>
        <div className="cc-callout cc-ok">
          <IconClock />
          <div>
            <h2>คิดว่าเสี่ยง ยังมีเวลา 72 ชั่วโมง</h2>
            <p>โทรเริ่ม PEP ได้ ไม่ต้องเล่าว่าไปไหนมา<span className="cc-tel">062 549 3639</span></p>
          </div>
        </div>
        <div className="cc-foot">
          <div className="cc-qr">
            <QRCodeSVG value={qrUrl} level="M" marginSize={0} />
          </div>
          <p dangerouslySetInnerHTML={{ __html: footerText || 'ชุดตรวจที่ให้ไป ตรวจอีกทีใน 4 สัปดาห์<br />คุยกับเราได้ที่ <span class="cc-site">testd.website</span>' }} />
        </div>
      </div>
    </div>
  );
}
