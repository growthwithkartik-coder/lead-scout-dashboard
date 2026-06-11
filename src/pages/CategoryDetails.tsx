import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Search } from "lucide-react";
import { CategoriesService } from "@/services/categories.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { exportToCsv } from "@/lib/csv";
import type { Place } from "@/services/types";

const PAGE = 25;

export default function CategoryDetails() {
  const { id = "" } = useParams();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const cat = useQuery({ queryKey: ["category", id], queryFn: () => CategoriesService.get(id), enabled: !!id });
  const places = useQuery({ queryKey: ["category-places", id], queryFn: () => CategoriesService.places(id), enabled: !!id });

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return (places.data ?? []).filter((p) =>
      !s ||
      [p.name, p.address, p.email, p.phone, p.website, p.place_type, p.search_query]
        .some((v) => (v ?? "").toLowerCase().includes(s)),
    );
  }, [places.data, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const slice = filtered.slice((page - 1) * PAGE, page * PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/categories"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{cat.data?.name ?? (cat.isLoading ? "Loading…" : "Category")}</h1>
            <p className="text-sm text-muted-foreground">{cat.data?.description || "Category details and scraped places"}</p>
          </div>
        </div>
        <Button asChild>
          <Link to={`/scrape/new?category=${id}`}>Start new scrape</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(["Total Places", "Created", "Last Scraped"] as const).map((label, i) => (
          <Card key={label} style={{ boxShadow: "var(--shadow-card)" }}>
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
              {cat.isLoading ? <Skeleton className="mt-2 h-7 w-24" /> : (
                <p className="mt-2 text-2xl font-semibold">
                  {i === 0 && (cat.data?.total_places ?? places.data?.length ?? 0)}
                  {i === 1 && (cat.data?.created_at ? new Date(cat.data.created_at).toLocaleDateString() : "—")}
                  {i === 2 && (cat.data?.last_scraped ? new Date(cat.data.last_scraped).toLocaleString() : "—")}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="places">
        <TabsList>
          <TabsTrigger value="places">Scraped Places</TabsTrigger>
        </TabsList>
        <TabsContent value="places" className="mt-4">
          <Card style={{ boxShadow: "var(--shadow-card)" }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Places ({filtered.length})</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search…" className="h-9 w-56 pl-8" />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    exportToCsv<Place>(`${cat.data?.name ?? "category"}-places.csv`, filtered, [
                      "name", "address", "website", "phone", "email", "place_type", "rating", "search_query", "scraped_at",
                    ])
                  }
                >
                  <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {places.isLoading ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : places.isError ? (
                <p className="py-8 text-center text-sm text-destructive">Failed to load places.</p>
              ) : !slice.length ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No places found.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Website</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Query</TableHead>
                          <TableHead>Scraped</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {slice.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell className="max-w-xs truncate text-sm">{p.address}</TableCell>
                            <TableCell className="text-sm">
                              {p.website ? <a className="text-primary hover:underline" href={p.website} target="_blank" rel="noreferrer">link</a> : "—"}
                            </TableCell>
                            <TableCell className="text-sm">{p.phone || "—"}</TableCell>
                            <TableCell className="text-sm">{p.email || "—"}</TableCell>
                            <TableCell>{p.place_type ? <Badge variant="secondary">{p.place_type}</Badge> : "—"}</TableCell>
                            <TableCell>{p.rating ?? "—"}</TableCell>
                            <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">{p.search_query}</TableCell>
                            <TableCell className="text-sm">{p.scraped_at ? new Date(p.scraped_at).toLocaleString() : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Page {page} of {pageCount}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
