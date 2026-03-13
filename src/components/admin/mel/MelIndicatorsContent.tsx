import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Target, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MelIndicatorsContent() {
  const { language } = useLanguage();
  const isTh = language === "th";

  const { data: indicators, isLoading } = useQuery({
    queryKey: ["mel-indicators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("indicator_definitions")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const levels = ["impact", "outcome", "intermediate_outcome", "output"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{isTh ? "ตัวชี้วัด" : "Indicators"}</h2>
          <p className="text-muted-foreground text-sm">{isTh ? "นิยามและเป้าหมายตัวชี้วัด MEL" : "MEL indicator definitions & targets"}</p>
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />{isTh ? "เพิ่มตัวชี้วัด" : "Add Indicator"}</Button>
      </div>

      {(!indicators || indicators.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">{isTh ? "ยังไม่มีตัวชี้วัด" : "No indicators defined yet"}</p>
          </CardContent>
        </Card>
      ) : (
        levels.map(level => {
          const levelIndicators = indicators.filter((i: any) => i.result_level === level);
          if (levelIndicators.length === 0) return null;
          return (
            <div key={level} className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground capitalize">{level.replace(/_/g, " ")}</h3>
              <div className="grid gap-3">
                {levelIndicators.map((ind: any) => (
                  <Card key={ind.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-foreground">{isTh ? ind.indicator_name_th : ind.indicator_name_en}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {ind.indicator_code} · {ind.unit} · {ind.collection_frequency}
                          </p>
                        </div>
                        {ind.target_value && (
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{isTh ? "เป้าหมาย" : "Target"}</p>
                            <p className="text-lg font-bold text-primary">{ind.target_value}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
