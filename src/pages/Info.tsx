import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { InfoCard } from "@/components/InfoCard";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { Pill, Clock, Shield, TestTube, Heart, Search } from "lucide-react";

export default function Info() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  
  const articles = [
    { id: "what-is-prep", icon: Pill, title: t('info.whatIsPrep'), description: t('info.whatIsPrep.desc') },
    { id: "daily-vs-ondemand", icon: Clock, title: t('info.dailyVsOndemand'), description: t('info.dailyVsOndemand.desc') },
    { id: "what-is-pep", icon: Shield, title: t('info.whatIsPep'), description: t('info.whatIsPep.desc') },
    { id: "hiv-testing", icon: TestTube, title: t('info.hivTesting'), description: t('info.hivTesting.desc') },
    { id: "condoms-harm-reduction", icon: Heart, title: t('info.condoms'), description: t('info.condoms.desc') },
  ];

  const filteredArticles = articles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <PageContainer>
        <PageHeader title={t('info.title')} subtitle={t('info.subtitle')} />
        
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={t('info.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 pl-12 text-lg"
          />
        </div>
        
        <div className="space-y-3 animate-slide-up">
          {filteredArticles.map((article) => (
            <InfoCard key={article.id} icon={article.icon} title={article.title} description={article.description} to={`/info/${article.id}`} />
          ))}
        </div>
        
        {filteredArticles.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('info.noResults')}</p>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}
