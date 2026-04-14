import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, Settings2, Users, Trophy, Loader2, Shuffle } from "lucide-react";

interface RewardConfig {
  config_key: string;
  config_value: any;
}

interface Cycle {
  id: string;
  month_key: string;
  cycle_label: string | null;
  status: string;
  drawn_at: string | null;
}

interface Winner {
  id: string;
  user_id: string;
  reward_type: string;
  month_key: string;
  display_name?: string;
}

export function AdminMonthlyDrawContent() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<RewardConfig[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);

  // Editable config
  const [minPoints, setMinPoints] = useState(100);
  const [pointsPerEntry, setPointsPerEntry] = useState(50);
  const [bigPrizeEn, setBigPrizeEn] = useState("Grand Prize");
  const [bigPrizeTh, setBigPrizeTh] = useState("รางวัลใหญ่");
  const [smallPrizeEn, setSmallPrizeEn] = useState("Consolation Prize");
  const [smallPrizeTh, setSmallPrizeTh] = useState("รางวัลปลอบใจ");
  const [bigCount, setBigCount] = useState(1);
  const [smallCount, setSmallCount] = useState(5);
  const [drawDay, setDrawDay] = useState(1);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [configRes, cycleRes] = await Promise.all([
      supabase.from('reward_config').select('*'),
      supabase.from('reward_cycles').select('*').order('month_key', { ascending: false }).limit(12),
    ]);

    if (configRes.data) {
      setConfigs(configRes.data as RewardConfig[]);
      configRes.data.forEach((c: any) => {
        const v = c.config_value;
        if (c.config_key === 'eligibility_threshold') setMinPoints(v.min_points || 100);
        if (c.config_key === 'extra_entry_interval') setPointsPerEntry(v.points_per_entry || 50);
        if (c.config_key === 'prize_labels') {
          setBigPrizeEn(v.big_prize_en || 'Grand Prize');
          setBigPrizeTh(v.big_prize_th || 'รางวัลใหญ่');
          setSmallPrizeEn(v.small_prize_en || 'Consolation Prize');
          setSmallPrizeTh(v.small_prize_th || 'รางวัลปลอบใจ');
          setBigCount(v.big_prize_count || 1);
          setSmallCount(v.small_prize_count || 5);
        }
        if (c.config_key === 'draw_settings') setDrawDay(v.draw_day_of_month || 1);
      });
    }
    if (cycleRes.data) setCycles(cycleRes.data as Cycle[]);
    setLoading(false);
  };

  const saveConfig = async () => {
    const updates = [
      { key: 'eligibility_threshold', value: { min_points: minPoints } },
      { key: 'extra_entry_interval', value: { points_per_entry: pointsPerEntry } },
      {
        key: 'prize_labels', value: {
          big_prize_en: bigPrizeEn, big_prize_th: bigPrizeTh,
          small_prize_en: smallPrizeEn, small_prize_th: smallPrizeTh,
          big_prize_count: bigCount, small_prize_count: smallCount,
        }
      },
      { key: 'draw_settings', value: { draw_day_of_month: drawDay, auto_draw: false } },
    ];

    for (const u of updates) {
      await supabase
        .from('reward_config')
        .update({ config_value: u.value, updated_at: new Date().toISOString(), updated_by: user?.id })
        .eq('config_key', u.key);
    }
    toast.success("Configuration saved");
  };

  const runDraw = async (monthKey: string, cycleId: string) => {
    if (!confirm(`Run draw for ${monthKey}? This cannot be undone.`)) return;
    setDrawing(true);

    try {
      // Get eligible users with their entries
      const { data: eligible } = await supabase
        .from('reward_points_monthly')
        .select('user_id, entries')
        .eq('month_key', monthKey)
        .eq('is_eligible', true);

      if (!eligible || eligible.length === 0) {
        toast.error("No eligible users for this month");
        setDrawing(false);
        return;
      }

      // Build weighted pool
      const pool: string[] = [];
      eligible.forEach(e => {
        for (let i = 0; i < Math.max(e.entries, 1); i++) {
          pool.push(e.user_id);
        }
      });

      // Shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      const winners: { user_id: string; reward_type: string }[] = [];
      const usedIds = new Set<string>();

      // Pick big prize winner(s)
      for (let i = 0; i < bigCount && pool.length > 0; i++) {
        const idx = pool.findIndex(id => !usedIds.has(id));
        if (idx === -1) break;
        usedIds.add(pool[idx]);
        winners.push({ user_id: pool[idx], reward_type: 'big' });
      }

      // Pick small prize winners
      for (let i = 0; i < smallCount; i++) {
        const idx = pool.findIndex(id => !usedIds.has(id));
        if (idx === -1) break;
        usedIds.add(pool[idx]);
        winners.push({ user_id: pool[idx], reward_type: 'small' });
      }

      // Insert winners
      const winnerRows = winners.map(w => ({
        cycle_id: cycleId,
        month_key: monthKey,
        user_id: w.user_id,
        reward_type: w.reward_type,
      }));

      const { error: winErr } = await supabase.from('reward_winners').insert(winnerRows);
      if (winErr) throw winErr;

      // Update cycle status
      await supabase
        .from('reward_cycles')
        .update({ status: 'drawn', drawn_at: new Date().toISOString(), drawn_by: user?.id })
        .eq('id', cycleId);

      // Update ranks
      const { data: allMonthly } = await supabase
        .from('reward_points_monthly')
        .select('id, total_points')
        .eq('month_key', monthKey)
        .order('total_points', { ascending: false });

      if (allMonthly) {
        for (let i = 0; i < allMonthly.length; i++) {
          await supabase
            .from('reward_points_monthly')
            .update({ rank: i + 1 })
            .eq('id', allMonthly[i].id);
        }
      }

      toast.success(`Draw complete! ${winners.length} winners selected.`);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Draw failed");
    }
    setDrawing(false);
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5" />
            Monthly Draw Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Min Points for Eligibility</Label>
              <Input type="number" value={minPoints} onChange={e => setMinPoints(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Points per Extra Entry</Label>
              <Input type="number" value={pointsPerEntry} onChange={e => setPointsPerEntry(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Big Prize Label (EN)</Label>
              <Input value={bigPrizeEn} onChange={e => setBigPrizeEn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Big Prize Label (TH)</Label>
              <Input value={bigPrizeTh} onChange={e => setBigPrizeTh(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Small Prize Label (EN)</Label>
              <Input value={smallPrizeEn} onChange={e => setSmallPrizeEn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Small Prize Label (TH)</Label>
              <Input value={smallPrizeTh} onChange={e => setSmallPrizeTh(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Big Prize Winners</Label>
              <Input type="number" value={bigCount} onChange={e => setBigCount(Number(e.target.value))} min={1} />
            </div>
            <div className="space-y-2">
              <Label>Small Prize Winners</Label>
              <Input type="number" value={smallCount} onChange={e => setSmallCount(Number(e.target.value))} min={1} />
            </div>
            <div className="space-y-2">
              <Label>Draw Day of Month</Label>
              <Input type="number" value={drawDay} onChange={e => setDrawDay(Number(e.target.value))} min={1} max={28} />
            </div>
          </div>

          <Button onClick={saveConfig}>Save Configuration</Button>
        </CardContent>
      </Card>

      {/* Cycles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-5 w-5" />
            Monthly Cycles ({cycles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cycles.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No cycles yet. Cycles are auto-created when users earn points.
            </p>
          ) : (
            <div className="space-y-3">
              {cycles.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card">
                  <div>
                    <p className="font-medium text-sm">{c.cycle_label || c.month_key}</p>
                    <p className="text-xs text-muted-foreground">
                      Status: <Badge variant={c.status === 'drawn' ? 'default' : 'secondary'} className="text-[10px] ml-1">{c.status}</Badge>
                    </p>
                  </div>
                  {c.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runDraw(c.month_key, c.id)}
                      disabled={drawing}
                    >
                      {drawing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Shuffle className="h-3 w-3 mr-1" />}
                      Run Draw
                    </Button>
                  )}
                  {c.status === 'drawn' && c.drawn_at && (
                    <span className="text-xs text-muted-foreground">
                      Drawn {new Date(c.drawn_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
