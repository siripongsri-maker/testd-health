import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/seo/SEOHead";
import { ConnectStatusCheck } from "@/components/mcp/ConnectStatusCheck";

const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
const MCP_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/mcp`;
const APP_NAME = "testD";
const SLUG = "testd-app";
const CLAUDE_CODE_CMD = `claude mcp add --scope user --transport http ${SLUG} '${MCP_URL}'`;

function Copyable({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="flex-1 overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs sm:text-sm">{value}</code>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        aria-label="คัดลอก"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        <span className="ml-2">{copied ? "คัดลอกแล้ว" : "คัดลอก"}</span>
      </Button>
    </div>
  );
}

function Fix({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ol>
  );
}

type Issue = { id: string; title: string; symptom: string; fixes: React.ReactNode[] };

const COMMON: Issue[] = [
  {
    id: "url",
    title: "ลิงก์เซิร์ฟเวอร์ผิด (ใส่ URL ของเว็บแทน MCP)",
    symptom: "ขึ้นว่า “Could not connect”, 404 หรือ “not a valid MCP server”",
    fixes: [
      <>ต้องใช้ลิงก์ที่ลงท้ายด้วย <code className="rounded bg-muted px-1">/functions/v1/mcp</code> เท่านั้น ไม่ใช่ที่อยู่เว็บไซต์</>,
      <>ตรวจว่าไม่มีช่องว่างหรือเครื่องหมายคำพูดติดมาตอนวางลิงก์</>,
      <>คัดลอกลิงก์ล่าสุดจากด้านบนของหน้านี้แล้ววางใหม่</>,
    ],
  },
  {
    id: "auth",
    title: "ล็อกอินไม่ผ่าน / หน้าอนุญาตสิทธิ์ค้าง",
    symptom: "กด Connect แล้วเด้งไปหน้าเข้าสู่ระบบ แต่วนกลับมาที่เดิม หรือขึ้น 401",
    fixes: [
      <>เข้าสู่ระบบ {APP_NAME} ในเบราว์เซอร์เดียวกันก่อน แล้วค่อยกดเชื่อมต่อใหม่</>,
      <>ปิดโหมดไม่ระบุตัวตน (incognito) และอนุญาตคุกกี้/ป๊อปอัปของเว็บนี้</>,
      <>ถ้าหน้าอนุญาตสิทธิ์หมดอายุ (ทิ้งไว้นาน) ให้เริ่มขั้นตอนเชื่อมต่อใหม่ตั้งแต่ต้น</>,
      <>ยังไม่ผ่าน: ลบการเชื่อมต่อเดิมออกทั้งหมด แล้วเชื่อมต่อใหม่หนึ่งครั้ง</>,
    ],
  },
  {
    id: "no-tools",
    title: "เชื่อมต่อสำเร็จแต่ไม่เห็นเครื่องมือ",
    symptom: "connector แสดงว่า connected แต่ผู้ช่วยบอกว่าไม่มีเครื่องมือให้ใช้",
    fixes: [
      <>กดรีเฟรช/อัปเดตรายการเครื่องมือในหน้า connector</>,
      <>เริ่มแชทหรือเซสชันใหม่ เพราะรายการเครื่องมือถูกโหลดตอนเริ่มเซสชัน</>,
      <>เปิดสวิตช์เครื่องมือของ connector นี้ในแชทนั้น (บางแอปต้องเปิดทีละแชท)</>,
      <>ใช้ปุ่มตรวจสถานะด้านบน ถ้าที่นี่เห็นเครื่องมือแต่ผู้ช่วยไม่เห็น ปัญหาอยู่ที่ฝั่งแอปผู้ช่วย</>,
    ],
  },
  {
    id: "stale",
    title: "เครื่องมือเป็นเวอร์ชันเก่า หลังลิงก์หรือชื่อเปลี่ยน",
    symptom: "เรียกเครื่องมือแล้วขึ้นว่าไม่พบ หรือผลลัพธ์ไม่ตรงกับที่ควรเป็น",
    fixes: [
      <>ลบ connector เดิมทิ้ง แล้วสร้างใหม่ด้วยลิงก์ล่าสุด (แก้ URL ของ connector เดิมมักไม่มีผล)</>,
      <>Claude Code: <code className="rounded bg-muted px-1">claude mcp remove {SLUG}</code> แล้วติดตั้งใหม่</>,
      <>เริ่มเซสชันใหม่หลังติดตั้งเสร็จทุกครั้ง</>,
    ],
  },
  {
    id: "timeout",
    title: "เรียกเครื่องมือแล้วค้างหรือ timeout",
    symptom: "ผู้ช่วยขึ้นว่า interrupted, timed out หรือรอนานผิดปกติ",
    fixes: [
      <>ลองใหม่อีกครั้ง คำขอแรกหลังพักนานอาจช้าเพราะเซิร์ฟเวอร์เพิ่งตื่น</>,
      <>ลดขนาดคำขอ เช่น ระบุคำค้นให้แคบลงแทนการขอข้อมูลทั้งหมด</>,
      <>ตรวจสถานะด้วยปุ่มด้านบน ถ้าที่นี่ตอบเร็วปกติ ให้เริ่มเซสชันใหม่ในผู้ช่วย</>,
    ],
  },
  {
    id: "network",
    title: "เครือข่ายองค์กร/VPN บล็อก",
    symptom: "เชื่อมต่อไม่ได้เฉพาะบางเครื่องหรือบางเครือข่าย",
    fixes: [
      <>ลองสลับเครือข่าย เช่น ปิด VPN หรือใช้เน็ตมือถือ</>,
      <>ขอให้ฝ่ายไอทีอนุญาตโดเมน <code className="rounded bg-muted px-1">{PROJECT_REF}.supabase.co</code></>,
      <>ตรวจว่าเวลาและวันที่ของเครื่องถูกต้อง เพราะมีผลกับใบรับรอง HTTPS</>,
    ],
  },
];

export default function ConnectTroubleshooting() {
  return (
    <>
      <SEOHead
        title="แก้ปัญหาการเชื่อมต่อ MCP | testD"
        description="รวมปัญหาที่พบบ่อยเวลาเชื่อม ChatGPT, Claude และ Claude Code เข้ากับ testD พร้อมวิธีแก้ทีละขั้นตอน"
      />
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <header className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/connect">
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-2">กลับไปหน้าเชื่อมต่อ</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">แก้ปัญหาการเชื่อมต่อผู้ช่วย AI</h1>
          <p className="text-muted-foreground">
            ปัญหาที่พบบ่อยเวลาเชื่อม ChatGPT, Claude หรือ Claude Code เข้ากับ {APP_NAME} พร้อมวิธีแก้ทีละขั้นตอน
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">เริ่มจากตรงนี้ก่อน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ตรวจว่าเซิร์ฟเวอร์เข้าถึงได้จริง ถ้าตรงนี้ผ่านแต่ผู้ช่วยยังใช้ไม่ได้ แปลว่าปัญหาอยู่ที่การตั้งค่าฝั่งผู้ช่วย
            </p>
            <Copyable value={MCP_URL} />
            <ConnectStatusCheck mcpUrl={MCP_URL} />
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">ปัญหาที่พบบ่อย</h2>
          <Accordion type="single" collapsible className="rounded-xl border">
            {COMMON.map((issue) => (
              <AccordionItem key={issue.id} value={issue.id} className="px-4">
                <AccordionTrigger className="text-left text-sm font-medium">{issue.title}</AccordionTrigger>
                <AccordionContent className="space-y-3 pb-4">
                  <p className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">อาการ: {issue.symptom}</span>
                  </p>
                  <Fix items={issue.fixes} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">แก้ตามผู้ช่วยที่ใช้</h2>
          <Tabs defaultValue="chatgpt">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
              <TabsTrigger value="claude">Claude</TabsTrigger>
              <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
            </TabsList>

            <TabsContent value="chatgpt" className="space-y-4 pt-4">
              <Badge variant="secondary">ต้องเปิด Developer mode ใน Settings → Connectors → Advanced</Badge>
              <Fix
                items={[
                  <>ไม่เห็นเมนูสร้าง connector: เปิด Developer mode ก่อน แล้วรีเฟรชหน้า</>,
                  <>สร้าง connector ไม่สำเร็จ: ตรวจว่าเลือกชนิดการเชื่อมต่อเป็น MCP / Streamable HTTP และวางลิงก์ที่ลงท้ายด้วย <code className="rounded bg-muted px-1">/mcp</code></>,
                  <>connector มีอยู่แต่ไม่ทำงานในแชท: เปิดเครื่องมือของ connector นี้จากเมนูเครื่องมือในแชท แล้วเริ่มแชทใหม่</>,
                  <>อัปเดตแล้วยังเห็นของเก่า: ลบ connector แล้วสร้างใหม่ด้วยลิงก์ล่าสุด</>,
                  <>บัญชีที่รองรับ connector แบบกำหนดเอง (Plus/Pro/Business) เท่านั้นจึงจะเห็นเมนูนี้</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="claude" className="space-y-4 pt-4">
              <Badge variant="secondary">Settings → Connectors → Add custom connector</Badge>
              <Fix
                items={[
                  <>เพิ่ม connector แล้วขึ้น error: ตรวจว่าใช้ลิงก์เต็มรวม <code className="rounded bg-muted px-1">https://</code> และลงท้ายด้วย <code className="rounded bg-muted px-1">/mcp</code></>,
                  <>ค้างที่หน้าอนุญาตสิทธิ์: อนุญาตป๊อปอัป ล็อกอิน {APP_NAME} ให้เรียบร้อยก่อน แล้วกด Connect ใหม่</>,
                  <>แก้ URL ของ connector เดิมไม่ได้: Claude ไม่ให้แก้ ต้องลบแล้วเพิ่มใหม่</>,
                  <>ไม่เห็นเครื่องมือในแชท: เปิดสวิตช์ connector ที่ไอคอนเครื่องมือของแชทนั้น</>,
                  <>ในแอปมือถือบางเวอร์ชันยังใช้ custom connector ไม่ได้ ให้เชื่อมต่อจากเว็บก่อน</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="claude-code" className="space-y-4 pt-4">
              <Copyable value={CLAUDE_CODE_CMD} />
              <Fix
                items={[
                  <>ตรวจสถานะ: รัน <code className="rounded bg-muted px-1">claude mcp list</code> ควรเห็น <code className="rounded bg-muted px-1">{SLUG}</code> เป็น connected</>,
                  <>ขึ้น needs authentication: พิมพ์ <code className="rounded bg-muted px-1">/mcp</code> ในเซสชัน แล้วเลือกเซิร์ฟเวอร์เพื่อทำ OAuth ให้เสร็จในเบราว์เซอร์</>,
                  <>ติดตั้งซ้ำแล้วชื่อชน: <code className="rounded bg-muted px-1">claude mcp remove {SLUG}</code> ก่อน แล้วติดตั้งใหม่</>,
                  <>ติดตั้งไว้ผิด scope: ใช้ <code className="rounded bg-muted px-1">--scope user</code> เพื่อให้ใช้ได้ทุกโปรเจกต์</>,
                  <>แก้เสร็จแล้วต้องออกจากเซสชันเดิมและเปิดใหม่ เครื่องมือจึงจะโหลด</>,
                ]}
              />
            </TabsContent>
          </Tabs>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ยังแก้ไม่ได้?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>เก็บข้อมูลเหล่านี้ไว้ตอนแจ้งปัญหา จะช่วยให้ตรวจสอบได้เร็วขึ้น</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>ชื่อผู้ช่วย AI และเวอร์ชัน (เว็บ/เดสก์ท็อป/มือถือ)</li>
              <li>ข้อความ error ที่เห็นแบบเต็ม</li>
              <li>ผลจากปุ่มตรวจสถานะด้านบน</li>
              <li>เวลาโดยประมาณที่เกิดปัญหา</li>
            </ul>
            <Button asChild variant="secondary" size="sm">
              <Link to="/connect">กลับไปทำขั้นตอนเชื่อมต่อใหม่</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
