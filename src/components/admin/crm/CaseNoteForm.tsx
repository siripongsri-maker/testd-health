
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CaseNoteFormProps {
  clientId: string;
  onSaved: () => void;
}

const NOTE_TYPES = [
  { value: "general", labelTh: "ทั่วไป", labelEn: "General" },
  { value: "observation", labelTh: "สังเกตการณ์", labelEn: "Observation" },
  { value: "follow_up", labelTh: "ติดตาม", labelEn: "Follow-up" },
  { value: "risk_flag", labelTh: "ธงเตือน", labelEn: "Risk Flag" },
  { value: "referral", labelTh: "ส่งต่อ", labelEn: "Referral" },
];

export default function CaseNoteForm({ clientId, onSaved }: CaseNoteFormProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [noteType, setNoteType] = useState("general");
  const [content, setContent] = useState("");
  const [isSensitive, setIsSensitive] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get staff branch
      const { data: staffBranch } = await supabase
        .from("branch_staff")
        .select("branch_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      const { error } = await supabase.from("case_notes").insert({
        client_id: clientId,
        staff_id: user.id,
        branch_id: staffBranch?.branch_id || null,
        note_type: noteType,
        content: content.trim(),
        is_sensitive: isSensitive,
      });

      if (error) throw error;

      toast.success(language === "th" ? "บันทึกสำเร็จ" : "Note saved");
      setContent("");
      setNoteType("general");
      setIsSensitive(false);
      setOpen(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        {language === "th" ? "เพิ่มบันทึก" : "Add Case Note"}
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{language === "th" ? "เพิ่มบันทึก" : "Add Case Note"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={noteType} onValueChange={setNoteType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {language === "th" ? t.labelTh : t.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Textarea
          placeholder={language === "th" ? "เขียนบันทึก..." : "Write note..."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />

        <div className="flex items-center gap-2">
          <Switch checked={isSensitive} onCheckedChange={setIsSensitive} id="sensitive" />
          <Label htmlFor="sensitive" className="text-sm">
            {language === "th" ? "ข้อมูลอ่อนไหว" : "Sensitive content"}
          </Label>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving || !content.trim()}>
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            {language === "th" ? "บันทึก" : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            {language === "th" ? "ยกเลิก" : "Cancel"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
