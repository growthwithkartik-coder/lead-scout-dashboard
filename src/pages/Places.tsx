import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search, ArrowUpDown } from "lucide-react";
import { PlacesService } from "@/services/places.service";
import { CategoriesService } from "@/services/categories.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportToCsv } from "@/lib/csv";
import type { Place } from "@/services/types";

const PAGE = 25;
type SortKey = "name" | "rating" | "place_type";

export default function Places() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [categoryId, setCategoryId] = useState<string>("all");

  const cats = useQuery({ queryKey: ["categories"], queryFn: CategoriesService.list });
  const places = useQuery({
    queryKey: ["places", categoryId],
    queryFn: () => PlacesService.list(categoryId === "all" ? undefined : { category_id: categoryId }),
  });

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    const list = (places.data ?? []).filter((p) =>
      !s ||
      [p.name, p.address, p.email, p.phone, p.website, p.place_type, p.category_name]
        .some((v) => (v ?? "").toLowerCase().includes(s)),
    );
    const sorted = [...list].sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [places.data, q, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const slice = filtered.slice((page - 1) * PAGE, page * PAGE);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Places</h1>
        <p className="text-sm text-muted-foreground">All scraped places across your categories.</p>
      </div>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">All places ({filtered.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search…" className="h-9 w-56 pl-8" />
            </div>
            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-48"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(cats.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToCsv<Place>(`places-${Date.now()}.csv`, filtered, [
                  "name", "address", "website", "phone", "email", "place_type", "rating", "category_name",
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
                      <TableHead>
                        <button className="flex items-center gap-1" onClick={() => toggleSort("name")}>
                          Name <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>
                        <button className="flex items-center gap-1" onClick={() => toggleSort("place_type")}>
                          Type <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button className="flex items-center gap-1" onClick={() => toggleSort("rating")}>
                          Rating <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead>Category</TableHead>
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
                        <TableCell className="text-sm">{p.category_name || "—"}</TableCell>
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
    </div>
  );
}
