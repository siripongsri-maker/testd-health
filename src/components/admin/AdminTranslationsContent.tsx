import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Search, Lock, Unlock, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface TranslationRow {
  id: string;
  namespace: string;
  key: string;
  source_lang: string;
  source_text: string;
  target_lang: string;
  translated_text: string;
  is_locked: boolean;
  created_at: string;
}

export function AdminTranslationsContent() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<TranslationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLang, setFilterLang] = useState('');

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from('translation_cache')
      .select('*')
      .order('key')
      .limit(500);

    if (filterLang) query = query.eq('target_lang', filterLang);
    if (search) query = query.ilike('key', `%${search}%`);

    const { data } = await query;
    setRows((data as TranslationRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterLang, search]);

  const toggleLock = async (row: TranslationRow) => {
    const { error } = await supabase
      .from('translation_cache')
      .update({ is_locked: !row.is_locked } as any)
      .eq('id', row.id);

    if (error) {
      toast.error('Failed to update');
      return;
    }
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_locked: !r.is_locked } : r));
    toast.success(row.is_locked ? 'Unlocked' : 'Locked');
  };

  const clvmLangs = SUPPORTED_LANGUAGES.filter(l => !['th', 'en'].includes(l.code));
  const totalByLang = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.target_lang] = (acc[r.target_lang] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      <h2 className="text-xl font-bold">{t('admin.translations')}</h2>

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        {clvmLangs.map(l => (
          <Card key={l.code} className="px-3 py-2 text-sm">
            <span className="font-medium">{l.nativeLabel}</span>
            <span className="ml-2 text-muted-foreground">{totalByLang[l.code] || 0} cached</span>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by key..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterLang}
          onChange={e => setFilterLang(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">All languages</option>
          {clvmLangs.map(l => (
            <option key={l.code} value={l.code}>{l.nativeLabel} ({l.code})</option>
          ))}
        </select>
        <Button variant="outline" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No translations cached yet. Switch to a CLVM language to trigger translation.
        </p>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-2 font-medium">Key</th>
                <th className="text-left p-2 font-medium">Lang</th>
                <th className="text-left p-2 font-medium">Source</th>
                <th className="text-left p-2 font-medium">Translation</th>
                <th className="text-center p-2 font-medium w-16">Lock</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  <td className="p-2 font-mono text-xs text-muted-foreground max-w-[150px] truncate">{row.key}</td>
                  <td className="p-2 font-medium">{row.target_lang}</td>
                  <td className="p-2 text-xs max-w-[200px] truncate">{row.source_text}</td>
                  <td className="p-2 max-w-[250px] truncate">{row.translated_text}</td>
                  <td className="p-2 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggleLock(row)}
                    >
                      {row.is_locked ? (
                        <Lock className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
