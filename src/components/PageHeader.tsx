import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Settings } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showHome?: boolean;
  showSettings?: boolean;
  backTo?: string;
  rightContent?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  subtitle, 
  showHome = true, 
  showSettings = false,
  backTo,
  rightContent 
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => backTo ? navigate(backTo) : navigate("/")}
          className="shrink-0 rounded-2xl glass-sm hover:glass h-10 w-10"
        >
          {backTo ? <ArrowLeft className="h-5 w-5" /> : <Home className="h-5 w-5" />}
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {rightContent}
        {showSettings && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/settings")}
            className="rounded-xl hover:bg-muted/80 h-10 w-10"
            aria-label="Open settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
