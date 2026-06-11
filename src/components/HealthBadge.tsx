import { useQuery } from "@tanstack/react-query";
import { HealthService } from "@/services/places.service";
import { Badge } from "@/components/ui/badge";

export function HealthBadge() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["api-health"],
    queryFn: HealthService.check,
    refetchInterval: 15000,
    retry: 0,
  });
  const online = !!data && !isError;
  return (
    <Badge
      variant={online ? "default" : "destructive"}
      className="gap-1.5"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          online ? "bg-emerald-400 animate-pulse" : "bg-red-300"
        }`}
      />
      API {isLoading ? "…" : online ? "Online" : "Offline"}
    </Badge>
  );
}
