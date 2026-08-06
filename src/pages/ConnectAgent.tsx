import { useState } from "react";
import { Copy, Check, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEOHead } from "@/components/seo/SEOHead";
import { ConnectStatusCheck } from "@/components/mcp/ConnectStatusCheck";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAgentConnectSettings } from "@/hooks/useAgentConnectSettings";


const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
const MCP_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/mcp`;
const APP_NAME = "testD";
const SLUG = "testd-app";
const CLAUDE_CODE_CMD = `claude mcp add --scope user --transport http ${SLUG} '${MCP_URL}'`;

const CHATGPT_ADVANCED = "https://chatgpt.com/#settings/Connectors/Advanced";
const CHATGPT_NEW = "https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins";
const CLAUDE_ADD = `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent(
  APP_NAME,
)}&connectorUrl=${encodeURIComponent(MCP_URL)}`;

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      aria-label={label}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="ml-2">{copied ? "คัดลอกแล้ว" : "คัดลอก"}</span>
    </Button>
  );
}

function Steps({
  items,
  group,
  completed,
  onToggle,
}: {
  items: React.ReactNode[];
  group?: string;
  completed?: string[];
  onToggle?: (stepId: string) => void;
}) {
  if (!group || !onToggle) {
    return (
      <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className="space-y-3 text-sm text-muted-foreground">
      {items.map((item, i) => {
        const stepId = `${group}:${i}`;
        const done = completed?.includes(stepId) ?? false;
        return (
          <li key={stepId} className="flex items-start gap-3 leading-relaxed">
            <Checkbox
              id={stepId}
              checked={done}
              onCheckedChange={() => onToggle(stepId)}
              className="mt-0.5 shrink-0"
              aria-label={`ทำขั้นตอนที่ ${i + 1} แล้ว`}
            />
            <label htmlFor={stepId} className={done ? "cursor-pointer line-through opacity-60" : "cursor-pointer"}>
              <span className="mr-1 font-medium text-foreground">{i + 1}.</span>
              {item}
            </label>
          </li>
        );
      })}
    </ol>
  );
}

export default function ConnectAgent() {
  return (
    <>
      <SEOHead
        title="เชื่อมต่อผู้ช่วย AI กับ testD | Agent connection"
        description="วิธีเชื่อมต่อ ChatGPT, Claude, Claude Code หรือผู้ช่วย AI อื่น ๆ เข้ากับ testD เพื่อใช้เครื่องมือของแอปได้โดยตรง"
      />
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">เชื่อมต่อผู้ช่วย AI กับ {APP_NAME}</h1>
          <p className="text-muted-foreground">
            คัดลอกลิงก์เซิร์ฟเวอร์ด้านล่าง แล้วทำตามขั้นตอนของผู้ช่วย AI ที่คุณใช้ เพื่อให้ผู้ช่วยเรียกใช้เครื่องมือของ {APP_NAME} ได้
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ลิงก์เซิร์ฟเวอร์ (MCP server URL)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="flex-1 overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs sm:text-sm">{MCP_URL}</code>
            <CopyButton value={MCP_URL} label="คัดลอกลิงก์เซิร์ฟเวอร์" />
          </CardContent>
        </Card>

        <ConnectStatusCheck mcpUrl={MCP_URL} />




        <section className="space-y-4">
          <h2 className="text-xl font-semibold">ขั้นตอนการเชื่อมต่อ</h2>
          <Tabs defaultValue="chatgpt">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
              <TabsTrigger value="claude">Claude</TabsTrigger>
              <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
              <TabsTrigger value="other">อื่น ๆ</TabsTrigger>
            </TabsList>

            <TabsContent value="chatgpt" className="pt-4">
              <Steps
                items={[
                  <>
                    เปิด{" "}
                    <a className="underline" href={CHATGPT_ADVANCED} target="_blank" rel="noreferrer">
                      ChatGPT → Apps (Advanced) <ExternalLink className="inline h-3 w-3" />
                    </a>{" "}
                    แล้วเปิด Developer mode (อ่านคำเตือนความเสี่ยงที่แสดงไว้ก่อน) หากเปิดไม่ได้ ให้ขอผู้ดูแล ChatGPT เปิดให้
                  </>,
                  <>
                    เปิด{" "}
                    <a className="underline" href={CHATGPT_NEW} target="_blank" rel="noreferrer">
                      หน้าต่าง “New plugin” <ExternalLink className="inline h-3 w-3" />
                    </a>
                  </>,
                  <>วางชื่อแอป “{APP_NAME}” และวางลิงก์เซิร์ฟเวอร์ด้านบนลงในช่องชื่อและช่อง URL</>,
                  <>ตรวจรายละเอียด ติ๊ก “I understand and want to continue” (ChatGPT แสดงคำเตือนนี้กับทุกเซิร์ฟเวอร์ที่เพิ่มเอง) แล้วกด “Create”</>,
                  <>เปิดใช้งานแอปจากช่องพิมพ์ข้อความ แล้วลองสั่งให้ ChatGPT ใช้งาน {APP_NAME}</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="claude" className="pt-4">
              <Steps
                items={[
                  <>
                    เปิด{" "}
                    <a className="underline" href={CLAUDE_ADD} target="_blank" rel="noreferrer">
                      หน้าต่างเพิ่ม custom connector ของ Claude <ExternalLink className="inline h-3 w-3" />
                    </a>{" "}
                    (ชื่อและลิงก์จะถูกกรอกให้อัตโนมัติ)
                  </>,
                  <>ตรวจรายละเอียด แล้วกด “Add”</>,
                  <>ถ้าหน้าต่างไม่เปิดขึ้นเอง ให้เข้าหน้า Connectors ของ Claude → “Add custom connector” → ตั้งชื่อและวางลิงก์เซิร์ฟเวอร์ด้านบน</>,
                  <>เปิดใช้งาน connector จากช่องพิมพ์ข้อความ แล้วลองสั่งให้ Claude ใช้งาน {APP_NAME}</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="claude-code" className="space-y-4 pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <code className="flex-1 overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs sm:text-sm">
                  {CLAUDE_CODE_CMD}
                </code>
                <CopyButton value={CLAUDE_CODE_CMD} label="คัดลอกคำสั่งติดตั้ง" />
              </div>
              <Steps
                items={[
                  <>รันคำสั่งด้านบนใน terminal</>,
                  <>เปิด Claude Code แล้วพิมพ์ <code className="rounded bg-muted px-1">/mcp</code> เพื่อยืนยันว่าเชื่อมต่อแล้ว (ถ้าเครื่องมือต้องล็อกอิน Claude Code จะให้เข้าสู่ระบบจากเมนูนี้)</>,
                  <>ลองสั่งให้ Claude Code ใช้งาน {APP_NAME}</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="other" className="pt-4">
              <Steps
                items={[
                  <>เปิดหน้าตั้งค่า MCP server หรือ custom connector ของผู้ช่วย AI ที่คุณใช้</>,
                  <>สร้างการเชื่อมต่อแบบ remote MCP server</>,
                  <>ตั้งชื่อการเชื่อมต่อ แล้ววางลิงก์เซิร์ฟเวอร์ด้านบน</>,
                  <>ทำขั้นตอนเข้าสู่ระบบหรืออนุญาตสิทธิ์ให้เสร็จ</>,
                  <>เปิดใช้งานการเชื่อมต่อ แล้วลองสั่งให้ผู้ช่วยใช้งาน {APP_NAME}</>,
                ]}
              />
            </TabsContent>
          </Tabs>
        </section>

        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <RefreshCw className="h-5 w-5" /> รีเฟรชหลังแอปมีการอัปเดต
          </h2>
          <p className="text-sm text-muted-foreground">
            ผู้ช่วย AI จะจำรายการเครื่องมือไว้ เมื่อแอปมีการอัปเดตให้รีเฟรชการเชื่อมต่อเพื่อดึงเครื่องมือล่าสุด
          </p>
          <Tabs defaultValue="chatgpt-r">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="chatgpt-r">ChatGPT</TabsTrigger>
              <TabsTrigger value="claude-r">Claude</TabsTrigger>
              <TabsTrigger value="cc-r">Claude Code</TabsTrigger>
              <TabsTrigger value="other-r">อื่น ๆ</TabsTrigger>
            </TabsList>

            <TabsContent value="chatgpt-r" className="pt-4">
              <Steps
                items={[
                  <>เปิดหน้า Plugins ของ ChatGPT แล้วเลือกแอปนี้</>,
                  <>เลื่อนลงไปที่ “Information” แล้วกด “Refresh”</>,
                  <>ChatGPT แก้ URL ของแอปเดิมไม่ได้ ถ้าลิงก์เปลี่ยน ให้ลบแอปออกจาก Plugins แล้วทำขั้นตอนเชื่อมต่อใหม่ด้วยลิงก์ล่าสุด</>,
                  <>เริ่มแชทใหม่ แล้วสั่งให้ ChatGPT ใช้งาน {APP_NAME}</>,
                ]}
              />
            </TabsContent>
            <TabsContent value="claude-r" className="pt-4">
              <Steps
                items={[
                  <>เปิดหน้า Connectors แล้วเลือก connector นี้</>,
                  <>กดรีเฟรช/อัปเดตรายการเครื่องมือของ connector</>,
                  <>Claude แก้ URL ของ connector เดิมไม่ได้ ถ้าลิงก์เปลี่ยน ให้ลบ connector แล้วทำขั้นตอนเชื่อมต่อใหม่ด้วยลิงก์ล่าสุด</>,
                  <>สั่งให้ Claude ใช้งาน {APP_NAME}</>,
                ]}
              />
            </TabsContent>
            <TabsContent value="cc-r" className="pt-4">
              <Steps
                items={[
                  <>เริ่มเซสชัน Claude Code ใหม่ ระบบจะโหลดเครื่องมือล่าสุดตอนเชื่อมต่อ</>,
                  <>
                    ถ้าลิงก์เปลี่ยน ให้รัน <code className="rounded bg-muted px-1">claude mcp remove {SLUG}</code> แล้วรันคำสั่งติดตั้งด้านบนอีกครั้งด้วยลิงก์ล่าสุด
                  </>,
                  <>สั่งให้ Claude Code ใช้งาน {APP_NAME}</>,
                ]}
              />
            </TabsContent>
            <TabsContent value="other-r" className="pt-4">
              <Steps
                items={[
                  <>เปิดหน้าตั้งค่า MCP server หรือ connector ของผู้ช่วย AI</>,
                  <>เลือกการเชื่อมต่อที่สร้างไว้สำหรับแอปนี้</>,
                  <>กดรีเฟรชรายการเครื่องมือ โหลดเซิร์ฟเวอร์ใหม่ หรือเชื่อมต่ออีกครั้ง</>,
                  <>ถ้าลิงก์เปลี่ยน ให้วางลิงก์ล่าสุดจากด้านบน</>,
                  <>เริ่มแชทหรือเซสชันใหม่ แล้วสั่งให้ผู้ช่วยใช้งาน {APP_NAME}</>,
                ]}
              />
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </>
  );
}
