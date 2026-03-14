import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Eye, FileDown, Trash2, Pencil, Plus, ShieldAlert, Lock } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { usePermissions } from '@/hooks/usePermissions';

const CLASSIFICATION_COLORS: Record<string, string> = {
  public: 'bg-success/10 text-success',
  internal: 'bg-muted text-muted-foreground',
  personal: 'bg-primary/10 text-primary',
  sensitive: 'bg-warning/10 text-warning',
  highly_restricted: 'bg-destructive/10 text-destructive',
  restricted: 'bg-accent text-accent-foreground',
};

function BoolIcon({ value }: { value: boolean }) {
  return value
    ? <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
    : <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />;
}

/** Admin view: shows the complete permission matrix across all roles and modules */
export function PermissionMatrixView() {
  const { language } = useLanguage();
  const { fullMatrix, loading } = usePermissions();
  const th = language === 'th';

  if (loading) return <p className="text-sm text-muted-foreground p-4">{th ? 'กำลังโหลด...' : 'Loading...'}</p>;

  // Group by role
  const roles = [...new Set(fullMatrix.map(r => r.role))];

  return (
    <div className="space-y-6">
      {roles.map(role => {
        const rows = fullMatrix.filter(r => r.role === role);
        return (
          <Card key={role} className="overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">{role}</h3>
              <Badge variant="outline" className="text-xs ml-auto">{rows.length} {th ? 'โมดูล' : 'modules'}</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">{th ? 'โมดูล' : 'Module'}</TableHead>
                    <TableHead className="text-center w-12"><Eye className="h-3.5 w-3.5 mx-auto" /></TableHead>
                    <TableHead className="text-center w-12"><Plus className="h-3.5 w-3.5 mx-auto" /></TableHead>
                    <TableHead className="text-center w-12"><Pencil className="h-3.5 w-3.5 mx-auto" /></TableHead>
                    <TableHead className="text-center w-12"><Trash2 className="h-3.5 w-3.5 mx-auto" /></TableHead>
                    <TableHead className="text-center w-12"><FileDown className="h-3.5 w-3.5 mx-auto" /></TableHead>
                    <TableHead className="text-center w-12"><ShieldAlert className="h-3.5 w-3.5 mx-auto" /></TableHead>
                    <TableHead className="w-24">{th ? 'ระดับ' : 'Class'}</TableHead>
                    <TableHead className="w-20">{th ? 'ขอบเขต' : 'Scope'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(row => (
                    <TableRow key={`${row.role}-${row.module}`}>
                      <TableCell className="font-medium text-xs">{row.module}</TableCell>
                      <TableCell><BoolIcon value={row.can_view} /></TableCell>
                      <TableCell><BoolIcon value={row.can_create} /></TableCell>
                      <TableCell><BoolIcon value={row.can_update} /></TableCell>
                      <TableCell><BoolIcon value={row.can_delete} /></TableCell>
                      <TableCell><BoolIcon value={row.can_export} /></TableCell>
                      <TableCell><BoolIcon value={row.can_reveal_pii} /></TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${CLASSIFICATION_COLORS[row.data_classification] || ''}`}>
                          {row.data_classification}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.branch_scoped
                          ? <Badge variant="outline" className="text-[10px]">{th ? 'สาขา' : 'Branch'}</Badge>
                          : <span className="text-xs text-muted-foreground">{th ? 'ทั้งหมด' : 'Global'}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        );
      })}

      {roles.length === 0 && (
        <Card className="p-8 text-center">
          <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{th ? 'ยังไม่มีข้อมูลสิทธิ์' : 'No permissions configured'}</p>
        </Card>
      )}
    </div>
  );
}
