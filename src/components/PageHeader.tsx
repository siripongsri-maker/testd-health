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
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => backTo ? navigate(backTo) : navigate("/")}
          className="shrink-0"
        >
          {backTo ? <ArrowLeft className="h-5 w-5" /> : <Home className="h-5 w-5" />}
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {rightContent}
        {showSettings && (
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <Settings className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
}