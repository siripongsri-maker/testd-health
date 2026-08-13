import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TrendRow {
  created_at: string;
  score: number;
  total: number;
}

type Granularity = "day" | "week" | "month";

function bucketKey(iso: string, g: Granularity) {
  // ใช้เวลา Asia/Bangkok เป็นหลัก
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  if (g === "month") return `${y}-${m}`;
  if (g === "day") return `${y}-${m}-${day}`;
  // week: วันจันทร์ต้นสัปดาห์
  const dow = (d.getUTCDay() + 6) % 7;
  const monday = new Date(d.getTime() - dow * 86400000);
  return `${monday.getUTCFullYear()}-${`${monday.getUTCMonth() + 1}`.padStart(2, "0")}-${`${monday.getUTCDate()}`.padStart(2, "0")}`;
}

export default function SafeSpaceTrendChart({ rows }: { rows: TrendRow[] }) {
  const [granularity, setGranularity] = useState<Granularity>("day");

  const data = useMemo(() => {
    const map = new Map<string, { responses: number; passed: number }>();
    rows.forEach((r) => {
      const key = bucketKey(r.created_at, granularity);
      const cur = map.get(key) || { responses: 0, passed: 0 };
      cur.responses += 1;
      if (r.total > 0 && r.score / r.total >= 0.7) cur.passed += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([key, v]) => ({
        label: granularity === "month" ? key : key.slice(5),
        responses: v.responses,
        passRate: v.responses ? Math.round((v.passed / v.responses) * 100) : 0,
      }));
  }, [rows, granularity]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-base">แนวโน้มผู้ตอบและอัตราผ่าน ≥70%</CardTitle>
        <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">รายวัน</SelectItem>
            <SelectItem value="week">รายสัปดาห์</SelectItem>
            <SelectItem value="month">รายเดือน</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูลในช่วงที่เลือก</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "hsl(var(--popover-foreground))",
                  }}
                  formatter={(value: number, name: string) =>
                    name === "อัตราผ่าน ≥70%" ? [`${value}%`, name] : [value, name]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="responses" name="ผู้ตอบ (คน)" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="passRate"
                  name="อัตราผ่าน ≥70%"
                  stroke="hsl(var(--chart-2, var(--accent-foreground)))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
