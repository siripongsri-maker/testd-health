import { useState } from 'react';
import { Eye, EyeOff, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePdpaAudit } from '@/hooks/usePdpaAudit';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';

interface MaskedFieldProps {
  /** The full value */
  value: string;
  /** Masked version to display by default */
  maskedValue: string;
  /** Label for audit log */
  fieldLabel: string;
  /** Target record ID for audit */
  targetId?: string;
  /** Classification level */
  classification?: 'personal' | 'sensitive' | 'highly_restricted';
  /** Allow reveal? */
  canReveal?: boolean;
  /** Allow copy? */
  canCopy?: boolean;
  className?: string;
}

/** Auto-masked sensitive field with reveal + audit logging */
export function MaskedField({
  value,
  maskedValue,
  fieldLabel,
  targetId,
  classification = 'personal',
  canReveal = true,
  canCopy = false,
  className = '',
}: MaskedFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const { log } = usePdpaAudit();
  const { language } = useLanguage();

  const handleReveal = () => {
    if (!revealed) {
      log({
        action_type: 'reveal_masked_field',
        target_type: fieldLabel,
        target_id: targetId,
        target_classification: classification,
      });
    }
    setRevealed(!revealed);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    log({
      action_type: 'reveal_masked_field',
      target_type: `copy_${fieldLabel}`,
      target_id: targetId,
      target_classification: classification,
      metadata: { action: 'clipboard_copy' },
    });
    toast.success(language === 'th' ? 'คัดลอกแล้ว' : 'Copied');
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="font-mono text-sm">
        {revealed ? value : maskedValue}
      </span>
      {canReveal && (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleReveal}>
          {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
      )}
      {canCopy && revealed && (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
          <Copy className="h-3 w-3" />
        </Button>
      )}
    </span>
  );
}

/** Mask helpers */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return '***';
  return phone.slice(0, 3) + '-XXX-' + phone.slice(-4);
}

export function maskEmail(email: string): string {
  if (!email) return '***';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return local.slice(0, 2) + '***@' + domain;
}

export function maskThaiId(id: string): string {
  if (!id || id.length < 4) return '***';
  return 'X-XXXX-XXXXX-XX-' + id.slice(-1);
}
