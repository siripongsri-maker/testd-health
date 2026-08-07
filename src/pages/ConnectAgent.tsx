import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

function shortenUrl(url: string) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const host = u.hostname.length > 24 ? `${u.hostname.slice(0, 10)}…${u.hostname.slice(-12)}` : u.hostname;
    const tail = parts.length ? `/…/${parts[parts.length - 1]}` : "";
    return `${host}${tail}`;
  } catch {
    return url.length > 40 ? `${url.slice(0, 20)}…${url.slice(-16)}` : url;
  }
}

async function writeClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = value;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

/** Short explanation shown before a connect link is copied or opened. */
function LinkConfirmBody({ preview }: { preview: string }) {
  return (
    <>
      <span className="block">
        ลิงก์นี้ใช้ให้ผู้ช่วย AI ของคุณดึง “ข้อมูลการตั้งค่าการเชื่อมต่อ” แบบไม่ระบุตัวตนเท่านั้น
        ไม่มีชื่อ เบอร์โทร หรือข้อมูลสุขภาพส่วนบุคคลอยู่ในลิงก์
      </span>
      <span className="mt-2 block break-all rounded-md bg-muted px-2 py-1 font-mono text-xs">{preview}</span>
      <span className="mt-2 block text-xs">
        แชร์ลิงก์นี้เฉพาะกับผู้ช่วย AI ที่คุณไว้ใจ และยกเลิกการเชื่อมต่อได้ทุกเมื่อ
      </span>
    </>
  );
}

function ConfirmLinkDialog({
  value,
  actionLabel,
  onConfirm,
  children,
}: {
  value: string;
  actionLabel: string;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันก่อนใช้ลิงก์เชื่อมต่อ</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <LinkConfirmBody preview={shortenUrl(value)} />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{actionLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CopyButton({
  value,
  label,
  toastLabel,
  className,
  confirm,
}: {
  value: string;
  label: string;
  toastLabel?: string;
  className?: string;
  confirm?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    const ok = await writeClipboard(value);
    if (!ok) {
      toast.error("คัดลอกไม่สำเร็จ", { description: "กรุณาเลือกข้อความแล้วคัดลอกด้วยตัวเอง" });
      return;
    }
    setCopied(true);
    toast.success(`คัดลอก${toastLabel ?? "แล้ว"}`, { description: shortenUrl(value) });
    setTimeout(() => setCopied(false), 1800);
  };
  const button = (
    <Button
      variant={copied ? "default" : "secondary"}
      size="sm"
      className={className}
      onClick={confirm ? undefined : doCopy}
      aria-label={label}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="ml-2">{copied ? "คัดลอกแล้ว" : "คัดลอก"}</span>
    </Button>
  );
  if (!confirm) return button;
  return (
    <ConfirmLinkDialog value={value} actionLabel="คัดลอกลิงก์" onConfirm={doCopy}>
      {button}
    </ConfirmLinkDialog>
  );
}

function McpUrlCard() {
  const [showFull, setShowFull] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ลิงก์เซิร์ฟเวอร์ (MCP server URL)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <code
            className="flex-1 overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs sm:text-sm"
            title={MCP_URL}
          >
            {showFull ? MCP_URL : shortenUrl(MCP_URL)}
          </code>
          <CopyButton value={MCP_URL} label="คัดลอกลิงก์เซิร์ฟเวอร์" toastLabel="ลิงก์เซิร์ฟเวอร์แล้ว" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {showFull ? "นี่คือลิงก์เต็มสำหรับวางในผู้ช่วย AI" : "แสดงแบบย่อเพื่ออ่านง่าย ปุ่มคัดลอกจะคัดลอกลิงก์เต็มเสมอ"}
          </p>
          <Button variant="ghost" size="sm" onClick={() => setShowFull((v) => !v)}>
            {showFull ? "ย่อลิงก์" : "แสดงลิงก์เต็ม"}
          </Button>
        </div>
      </CardContent>
    </Card>
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
  const { settings, syncState, storedLocal, storedRemote, update, setSavePref, toggleStep, reset } =
    useAgentConnectSettings();
  const stepProps = { completed: settings.completedSteps, onToggle: toggleStep };
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

        <McpUrlCard />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5" /> ความปลอดภัยและความเป็นส่วนตัว
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              การเชื่อมต่อจะส่งเฉพาะคำสั่งที่คุณเลือกใช้และข้อมูลที่จำเป็นต่อการตอบกลับไปยังผู้ช่วย AI
              ไม่ควรส่งรหัสผ่าน โทเค็น หรือข้อมูลระบุตัวบุคคลที่ไม่จำเป็นในแชท
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>ใช้บัญชีแบบไม่ระบุตัวตนและหลีกเลี่ยงการใส่ชื่อจริง เบอร์โทร หรืออีเมลในคำสั่ง</li>
              <li>ตรวจสอบสิทธิ์และข้อมูลที่จะถูกแชร์ก่อนกดอนุญาตใน ChatGPT, Claude หรือผู้ช่วยอื่น</li>
              <li>ลบการเชื่อมต่อจากผู้ช่วย AI เมื่อเลิกใช้ และล้างประวัติแชทที่มีข้อมูลอ่อนไหว</li>
            </ul>
            <Link className="inline-flex text-sm font-medium text-primary underline underline-offset-4" to="/privacy-summary">
              อ่าน Privacy แบบย่อ: ระยะเวลาเก็บข้อมูล วิธีลบ และช่องทางช่วยเหลือ
            </Link>
          </CardContent>
        </Card>

        <ConnectStatusCheck
          mcpUrl={MCP_URL}
          autoRun={settings.autoCheck}
          lastCheck={settings.lastCheck}
          onResult={(status) => update({ lastCheck: { status, at: new Date().toISOString() } })}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">การตั้งค่าของคุณ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="auto-check" className="text-sm font-normal text-muted-foreground">
                ตรวจสถานะอัตโนมัติเมื่อเปิดหน้านี้
              </Label>
              <Switch
                id="auto-check"
                checked={settings.autoCheck}
                onCheckedChange={(v) => update({ autoCheck: v })}
              />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <p className="text-sm font-medium">ข้อมูลที่ถูกบันทึกไว้</p>
              {(
                [
                  {
                    key: "client" as const,
                    label: "แท็บผู้ช่วย AI ที่เลือก",
                    local: storedLocal?.client ?? null,
                    remote: storedRemote?.client ?? null,
                    fmt: (v: string | null) => (v ? v : "—"),
                  },
                  {
                    key: "steps" as const,
                    label: "ขั้นตอนที่ติ๊กแล้ว",
                    local: storedLocal?.completedSteps?.length ?? 0,
                    remote: storedRemote?.completedSteps?.length ?? 0,
                    fmt: (v: number) => (v > 0 ? `${v} ขั้นตอน` : "—"),
                  },
                  {
                    key: "lastCheck" as const,
                    label: "ผลตรวจสถานะล่าสุด",
                    local: storedLocal?.lastCheck?.at ?? null,
                    remote: storedRemote?.lastCheck?.at ?? null,
                    fmt: (v: string | null) =>
                      v ? new Date(v).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "—",
                  },
                ] as const
              ).map((row) => (
                <div key={row.key} className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Label htmlFor={`save-${row.key}`} className="text-sm font-normal">
                      {row.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      ในเครื่อง: {(row.fmt as (v: never) => string)(row.local as never)} · บนเซิร์ฟเวอร์:{" "}
                      {settings.savePrefs.server
                        ? (row.fmt as (v: never) => string)(row.remote as never)
                        : "ปิดการบันทึก"}
                    </p>
                  </div>
                  <Switch
                    id={`save-${row.key}`}
                    checked={settings.savePrefs[row.key]}
                    onCheckedChange={(v) => setSavePref(row.key, v)}
                  />
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <div className="min-w-0">
                  <Label htmlFor="save-server" className="text-sm font-normal">
                    สำรองข้อมูลบนเซิร์ฟเวอร์ (แบบไม่ระบุตัวตน)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {settings.savePrefs.server
                      ? storedRemote
                        ? "มีสำเนาบนเซิร์ฟเวอร์แล้ว"
                        : "ยังไม่มีสำเนาบนเซิร์ฟเวอร์"
                      : "ปิดอยู่ — เก็บเฉพาะในเครื่องนี้"}
                  </p>
                </div>
                <Switch
                  id="save-server"
                  checked={settings.savePrefs.server}
                  onCheckedChange={(v) => setSavePref("server", v)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                ระบบจำแท็บผู้ช่วย AI ที่คุณเลือกและขั้นตอนที่ทำแล้วไว้แบบไม่ระบุตัวตน (ไม่ต้องล็อกอิน) และจะกลับมาเหมือนเดิมเมื่อเปิดใหม่
                {syncState === "saving" && " · กำลังบันทึก…"}
                {syncState === "saved" && " · บันทึกแล้ว"}
                {syncState === "error" && " · บันทึกบนเซิร์ฟเวอร์ไม่สำเร็จ (เก็บไว้ในเครื่องแล้ว)"}
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" /> ลบข้อมูลการเชื่อมต่อทั้งหมด
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>ลบข้อมูลการเชื่อมต่อทั้งหมด?</AlertDialogTitle>
                    <AlertDialogDescription>
                      ระบบจะล้างแท็บผู้ช่วย AI ที่เลือกไว้ ขั้นตอนที่ติ๊กแล้ว และประวัติผลตรวจสถานะล่าสุด
                      ทั้งในเครื่องนี้และสำเนาแบบไม่ระบุตัวตนบนเซิร์ฟเวอร์ การเชื่อมต่อในแอป AI ของคุณจะไม่ถูกลบ
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        reset();
                        toast.success("ลบข้อมูลการเชื่อมต่อแล้ว", {
                          description: "แท็บที่เลือก ขั้นตอนที่ติ๊ก และประวัติผลตรวจถูกล้างเรียบร้อย",
                        });
                      }}
                    >
                      ลบข้อมูล
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

            </div>
          </CardContent>
        </Card>




        <section className="space-y-4">
          <h2 className="text-xl font-semibold">ขั้นตอนการเชื่อมต่อ</h2>
          <Tabs value={settings.client} onValueChange={(v) => update({ client: v })}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
              <TabsTrigger value="claude">Claude</TabsTrigger>
              <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
              <TabsTrigger value="other">อื่น ๆ</TabsTrigger>
            </TabsList>

            <TabsContent value="chatgpt" className="pt-4">
              <Steps
                group="chatgpt"
                {...stepProps}
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
                group="claude"
                {...stepProps}
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
                <CopyButton value={CLAUDE_CODE_CMD} label="คัดลอกคำสั่งติดตั้ง" toastLabel="คำสั่งติดตั้งแล้ว" />
              </div>
              <Steps
                group="claude-code"
                {...stepProps}
                items={[
                  <>รันคำสั่งด้านบนใน terminal</>,
                  <>เปิด Claude Code แล้วพิมพ์ <code className="rounded bg-muted px-1">/mcp</code> เพื่อยืนยันว่าเชื่อมต่อแล้ว (ถ้าเครื่องมือต้องล็อกอิน Claude Code จะให้เข้าสู่ระบบจากเมนูนี้)</>,
                  <>ลองสั่งให้ Claude Code ใช้งาน {APP_NAME}</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="other" className="pt-4">
              <Steps
                group="other"
                {...stepProps}
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
          <Tabs value={`${settings.client}-r`} onValueChange={(v) => update({ client: v.replace(/-r$/, "") })}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="chatgpt-r">ChatGPT</TabsTrigger>
              <TabsTrigger value="claude-r">Claude</TabsTrigger>
              <TabsTrigger value="claude-code-r">Claude Code</TabsTrigger>
              <TabsTrigger value="other-r">อื่น ๆ</TabsTrigger>
            </TabsList>

            <TabsContent value="chatgpt-r" className="pt-4">
              <Steps
                group="chatgpt-r"
                {...stepProps}
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
                group="claude-r"
                {...stepProps}
                items={[
                  <>เปิดหน้า Connectors แล้วเลือก connector นี้</>,
                  <>กดรีเฟรช/อัปเดตรายการเครื่องมือของ connector</>,
                  <>Claude แก้ URL ของ connector เดิมไม่ได้ ถ้าลิงก์เปลี่ยน ให้ลบ connector แล้วทำขั้นตอนเชื่อมต่อใหม่ด้วยลิงก์ล่าสุด</>,
                  <>สั่งให้ Claude ใช้งาน {APP_NAME}</>,
                ]}
              />
            </TabsContent>
            <TabsContent value="claude-code-r" className="pt-4">
              <Steps
                group="claude-code-r"
                {...stepProps}
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
                group="other-r"
                {...stepProps}
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">เชื่อมต่อไม่สำเร็จ?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              ดูปัญหาที่พบบ่อยและวิธีแก้ทีละขั้นตอนสำหรับ ChatGPT, Claude และ Claude Code
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link to="/connect/troubleshooting">แก้ปัญหาการเชื่อมต่อ</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
