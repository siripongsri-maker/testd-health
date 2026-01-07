import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { articles } from "./Info";
import { ArrowLeft } from "lucide-react";

export default function InfoArticle() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const article = articles.find((a) => a.id === id);
  
  if (!article) {
    return (
      <>
        <PageContainer>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Article not found</p>
            <Button variant="link" onClick={() => navigate("/info")}>
              Back to articles
            </Button>
          </div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }
  
  const Icon = article.icon;

  return (
    <>
      <PageContainer>
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/info")}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">{article.title}</h1>
        </div>
        
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-primary shadow-soft">
            <Icon className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>
        
        {/* Content */}
        <div className="animate-slide-up">
          <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
            <div className="prose prose-sm max-w-none">
              {article.content.split("\n\n").map((paragraph, index) => {
                // Check if it's a header (ALL CAPS)
                if (paragraph === paragraph.toUpperCase() && paragraph.length < 50) {
                  return (
                    <h3 key={index} className="text-lg font-bold text-foreground mt-6 mb-3 first:mt-0">
                      {paragraph}
                    </h3>
                  );
                }
                
                // Check if it's a list
                if (paragraph.startsWith("•")) {
                  return (
                    <ul key={index} className="space-y-2 my-4">
                      {paragraph.split("\n").map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span>{item.replace("• ", "")}</span>
                        </li>
                      ))}
                    </ul>
                  );
                }
                
                return (
                  <p key={index} className="text-foreground leading-relaxed mb-4">
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
