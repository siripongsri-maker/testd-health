import { toast } from "sonner";

export interface FieldChange {
  /** Field label shown to staff (Thai) */
  label: string;
  from?: string | number | null;
  to?: string | number | null;
}

const fmt = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
};

export function summarizeChanges(changes: FieldChange[]): string {
  return changes
    .filter((c) => fmt(c.from) !== fmt(c.to))
    .map((c) => `${c.label}: ${fmt(c.from)} → ${fmt(c.to)}`)
    .join(" · ");
}

interface NotifySavedOptions {
  /** Toast headline. Defaults to "บันทึกแล้ว" */
  title?: string;
  /** Field-level diff shown as the toast description */
  changes?: FieldChange[];
  /** Free-text description (used when `changes` is empty) */
  description?: string;
  /** Undo handler — shows a "ยกเลิก" button when provided */
  onUndo?: () => void | Promise<void>;
  /** Details handler — shows a "ดูรายละเอียด" button when provided */
  onDetails?: () => void;
  duration?: number;
}

/**
 * Standard admin "saved" toast: headline + change summary,
 * with optional Undo and View-details actions.
 */
export function notifySaved({
  title = "บันทึกแล้ว",
  changes,
  description,
  onUndo,
  onDetails,
  duration,
}: NotifySavedOptions) {
  const summary = changes?.length ? summarizeChanges(changes) : "";
  const desc = summary || description || undefined;

  toast.success(title, {
    description: desc,
    duration: duration ?? (onUndo ? 10000 : 5000),
    action: onUndo
      ? {
          label: "ยกเลิก",
          onClick: () => {
            void (async () => {
              try {
                await onUndo();
                toast.success("ย้อนกลับการเปลี่ยนแปลงแล้ว", { description: desc });
              } catch (e: any) {
                toast.error("ย้อนกลับไม่สำเร็จ", { description: e?.message });
              }
            })();
          },
        }
      : onDetails
        ? { label: "ดูรายละเอียด", onClick: onDetails }
        : undefined,
    cancel:
      onUndo && onDetails
        ? { label: "ดูรายละเอียด", onClick: onDetails }
        : undefined,
  });
}
