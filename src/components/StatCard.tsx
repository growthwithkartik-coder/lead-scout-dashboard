import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  label: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  loading?: boolean;
  accent?: "primary" | "success" | "warning" | "destructive";
}

const accents = {
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  destructive: "text-destructive bg-destructive/10",
};

export function StatCard({ label, value, icon: Icon, trend, loading, accent = "primary" }: Props) {
  return (
    <Card className="overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-3xl font-semibold tracking-tight">{value}</p>
            )}
            {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accents[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
