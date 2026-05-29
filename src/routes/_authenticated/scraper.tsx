import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Loader2, Star, Globe, Phone, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/scraper")({
  head: () => ({ meta: [{ title: "Lead Scraper — LeadForge" }] }),
  component: Scraper,
});

// Mock business name pieces for demo
const NAMES = ["Sunrise", "Metro", "Apex", "Blue Door", "Greenleaf", "Ironwood", "Harbor", "North Star", "Cedar", "Crescent"];
const SUFFIX = ["Cafe", "Studio", "Clinic", "Bakery", "Marketing", "Gym", "Salon", "Bookstore", "Auto", "Realty"];

function generateMockLeads(keyword: string, location: string, n: number) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const name = `${NAMES[i % NAMES.length]} ${keyword.split(" ")[0] || SUFFIX[i % SUFFIX.length]}`;
    out.push({
      business_name: name,
      phone: `+1 (555) ${String(100 + i).padStart(3, "0")}-${String(1000 + i * 7).slice(-4)}`,
      email: Math.random() > 0.25 ? `contact@${name.toLowerCase().replace(/\s+/g, "")}.com` : null,
      website: Math.random() > 0.2 ? `https://${name.toLowerCase().replace(/\s+/g, "")}.com` : null,
      address: `${100 + i} Main St, ${location}`,
      rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
      category: keyword,
      source: "scraper",
      source_label: `${keyword} · ${location}`,
    });
  }
  return out;
}

function Scraper() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();

  const [keyword, setKeyword] = useState("coffee shop");
  const [location, setLocation] = useState("Austin, TX");
  const [count, setCount] = useState(20);
  const [progress, setProgress] = useState(0);
  const [scraping, setScraping] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const leadsQ = useQuery({
    queryKey: ["leads", uid, "scraper"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads").select("*").eq("user_id", uid).eq("source", "scraper")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const scrape = async () => {
    if (!keyword || !location) return toast.error("Enter a keyword and location");
    setScraping(true); setProgress(0);
    const total = Math.max(5, Math.min(50, count));
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 80));
      setProgress(Math.round((i / steps) * 100));
    }
    const rows = generateMockLeads(keyword, location, total).map((r) => ({ ...r, user_id: uid }));
    const { error } = await supabase.from("leads").insert(rows);
    setScraping(false); setProgress(0);
    if (error) return toast.error(error.message);
    toast.success(`Scraped ${total} demo leads`);
    qc.invalidateQueries({ queryKey: ["leads", uid, "scraper"] });
  };

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["leads", uid, "scraper"] }); },
  });

  const all = leadsQ.data ?? [];
  const filtered = all.filter((l) =>
    !search || `${l.business_name} ${l.email ?? ""} ${l.address ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice(page * pageSize, page * pageSize + pageSize);

  const exportCsv = () => {
    if (!filtered.length) return toast.error("No data to export");
    const header = ["Business", "Phone", "Email", "Website", "Address", "Rating", "Category"];
    const rows = filtered.map((l) => [l.business_name, l.phone, l.email, l.website, l.address, l.rating, l.category].map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `leads-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lead Scraper</h1>
        <p className="text-sm text-muted-foreground">Search businesses by keyword and location. Demo data only — no real scraping.</p>
      </div>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader><CardTitle className="text-base">Search businesses</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2 space-y-2">
              <Label>Keyword</Label>
              <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. dentist" />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" />
            </div>
            <div className="space-y-2">
              <Label>Results</Label>
              <Input type="number" min={5} max={50} value={count} onChange={(e) => setCount(parseInt(e.target.value || "20"))} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={scrape} disabled={scraping} className="gap-2">
              {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {scraping ? "Scraping…" : "Start scrape"}
            </Button>
            {scraping && <div className="flex-1"><Progress value={progress} /></div>}
          </div>
        </CardContent>
      </Card>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Scraped leads ({filtered.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Input placeholder="Search…" className="w-56" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2"><Download className="h-4 w-4" /> CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          {leadsQ.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : !pageData.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No leads yet — run a search above.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <div className="font-medium">{l.business_name}</div>
                          <Badge variant="secondary" className="mt-1 text-[10px]">{l.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{l.phone}</div>
                          {l.email && <div className="text-xs">{l.email}</div>}
                          {l.website && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Globe className="h-3 w-3" />{l.website?.replace(/^https?:\/\//, "")}</div>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3" />{l.address}</TableCell>
                        <TableCell><span className="inline-flex items-center gap-1 text-sm"><Star className="h-3 w-3 fill-warning text-warning" />{l.rating}</span></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => del.mutate(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Page {page + 1} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
