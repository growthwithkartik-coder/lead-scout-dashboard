import { useNavigate } from "react-router-dom";
import { Sparkles, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";

// Re-export the dashboard header so it can be reused; not currently needed but kept for clarity.
export function DashboardHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">LeadForge</div>
          <div className="text-[10px] text-muted-foreground hidden sm:block">{user?.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button
          variant="ghost" size="sm"
          onClick={async () => { await signOut(); toast.success("Signed out"); navigate("/login", { replace: true }); }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </header>
  );
}
