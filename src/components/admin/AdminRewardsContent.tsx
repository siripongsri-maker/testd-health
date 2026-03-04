import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Gift, Eye, EyeOff } from "lucide-react";

interface Reward {
  id: string;
  reward_title: string;
  reward_description: string;
  reward_image_url: string | null;
  display_order: number;
  is_active: boolean;
  status_label: string | null;
}

export function AdminRewardsContent() {
  const { t } = useLanguage();
  const [sectionEnabled, setSectionEnabled] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editing state
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    reward_title: "",
    reward_description: "",
    reward_image_url: "",
    status_label: "",
    is_active: true,
  });

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: flag }, { data: items }] = await Promise.all([
      supabase
        .from("app_feature_flags")
        .select("enabled")
        .eq("flag_key", "homepage_rewards_enabled")
        .single(),
      supabase
        .from("homepage_rewards")
        .select("*")
        .order("display_order", { ascending: true }),
    ]);
    setSectionEnabled(!!flag?.enabled);
    setRewards((items as Reward[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const toggleSection = async (val: boolean) => {
    setSectionEnabled(val);
    await supabase
      .from("app_feature_flags")
      .update({ enabled: val, updated_at: new Date().toISOString() })
      .eq("flag_key", "homepage_rewards_enabled");
    toast.success(val ? "Rewards section enabled" : "Rewards section disabled");
  };

  const resetForm = () => {
    setEditId(null);
    setForm({
      reward_title: "",
      reward_description: "",
      reward_image_url: "",
      status_label: "",
      is_active: true,
    });
  };

  const startEdit = (r: Reward) => {
    setEditId(r.id);
    setForm({
      reward_title: r.reward_title,
      reward_description: r.reward_description,
      reward_image_url: r.reward_image_url || "",
      status_label: r.status_label || "",
      is_active: r.is_active,
    });
  };

  const handleSave = async () => {
    if (!form.reward_title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);

    const payload = {
      reward_title: form.reward_title.trim(),
      reward_description: form.reward_description.trim(),
      reward_image_url: form.reward_image_url.trim() || null,
      status_label: form.status_label.trim() || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    if (editId) {
      await supabase.from("homepage_rewards").update(payload).eq("id", editId);
      toast.success("Reward updated");
    } else {
      await supabase.from("homepage_rewards").insert({
        ...payload,
        display_order: rewards.length,
      });
      toast.success("Reward created");
    }

    resetForm();
    await fetchAll();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reward?")) return;
    await supabase.from("homepage_rewards").delete().eq("id", id);
    toast.success("Reward deleted");
    fetchAll();
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Section Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5" />
            Homepage Rewards Section
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Show on Homepage</p>
              <p className="text-sm text-muted-foreground">
                Toggle the Health Rewards section visibility for all users
              </p>
            </div>
            <Switch checked={sectionEnabled} onCheckedChange={toggleSection} />
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editId ? "Edit Reward" : "Add New Reward"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.reward_title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reward_title: e.target.value }))
                }
                placeholder="e.g. Free Health Kit"
              />
            </div>
            <div className="space-y-2">
              <Label>Status Label</Label>
              <Input
                value={form.status_label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status_label: e.target.value }))
                }
                placeholder="e.g. Coming Soon"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.reward_description}
              onChange={(e) =>
                setForm((f) => ({ ...f, reward_description: e.target.value }))
              }
              placeholder="Short description of the reward…"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={form.reward_image_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, reward_image_url: e.target.value }))
              }
              placeholder="https://…"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            />
            <Label>Active</Label>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {editId ? "Update" : "Add Reward"}
            </Button>
            {editId && (
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rewards List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Rewards ({rewards.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No rewards yet. Add one above.
            </p>
          ) : (
            <div className="space-y-3">
              {rewards.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  {r.reward_image_url ? (
                    <img
                      src={r.reward_image_url}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Gift className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {r.reward_title}
                      </p>
                      {r.status_label && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {r.status_label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.reward_description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {r.is_active ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(r)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
