import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { InfoCard } from "@/components/InfoCard";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { Pill, Clock, Shield, TestTube, Heart, Search, BookOpen } from "lucide-react";

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
        
        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={t('info.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-12 text-base rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
          />
        </div>
        
        {/* Articles */}
        <div className="space-y-3">
          {filteredArticles.map((article, index) => (
            <div 
              key={article.id} 
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <InfoCard 
                icon={article.icon} 
                title={article.title} 
                description={article.description} 
                to={`/info/${article.id}`} 
              />
            </div>
          ))}
        </div>
        
        {/* No Results */}
        {filteredArticles.length === 0 && (
          <div className="text-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">{t('info.noResults')}</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Try a different search term</p>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}
