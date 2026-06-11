import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FolderKanban, MapPin, Activity, PlayCircle, ArrowRight } from "lucide-react";
import { CategoriesService } from "@/services/categories.service";
import { PlacesService } from "@/services/places.service";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const cats = useQuery({ queryKey: ["categories"], queryFn: CategoriesService.list });
  const places = useQuery({ queryKey: ["places"], queryFn: () => PlacesService.list() });

  const totalPlaces =
    cats.data?.reduce((s, c) => s + (c.total_places ?? 0), 0) ?? places.data?.length ?? 0;

  const recent = [...(cats.data ?? [])]
    .filter((c) => c.last_scraped)
    .sort((a, b) => new Date(b.last_scraped!).getTime() - new Date(a.last_scraped!).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of categories, places and recent scrape activity.
          </p>
        </div>
        <Button asChild>
          <Link to="/scrape/new"><PlayCircle className="mr-2 h-4 w-4" /> New scrape</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Categories" value={cats.data?.length ?? 0} icon={FolderKanban} loading={cats.isLoading} accent="primary" />
        <StatCard label="Total Places" value={totalPlaces} icon={MapPin} loading={cats.isLoading || places.isLoading} accent="success" />
        <StatCard label="Recent Scrapes" value={recent.length} icon={Activity} loading={cats.isLoading} accent="warning" />
        <StatCard label="Places Indexed" value={places.data?.length ?? 0} icon={MapPin} loading={places.isLoading} accent="destructive" />
      </div>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent scrape activity</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/categories">View all <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {cats.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : cats.isError ? (
            <p className="py-6 text-center text-sm text-destructive">Failed to load — is the API running?</p>
          ) : !recent.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No scrapes yet. Start one from the New Scrape page.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link to={`/categories/${c.id}`} className="text-sm font-medium hover:underline">
                      {c.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Last scraped {c.last_scraped ? new Date(c.last_scraped).toLocaleString() : "—"}
                    </p>
                  </div>
                  <Badge variant="secondary">{c.total_places ?? 0} places</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
