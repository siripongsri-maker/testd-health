import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/lib/i18n";

interface MelDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemLabel?: string;
}

export default function MelDeleteDialog({ open, onOpenChange, onConfirm, itemLabel }: MelDeleteDialogProps) {
  const { language } = useLanguage();
  const isTh = language === "th";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isTh ? "ยืนยันการลบ" : "Confirm Delete"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isTh
              ? `คุณต้องการลบ${itemLabel ? ` "${itemLabel}"` : "รายการนี้"}? การดำเนินการนี้ไม่สามารถย้อนกลับได้`
              : `Are you sure you want to delete${itemLabel ? ` "${itemLabel}"` : " this item"}? This action cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{isTh ? "ยกเลิก" : "Cancel"}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isTh ? "ลบ" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
