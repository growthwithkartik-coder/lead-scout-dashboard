import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["Restaurant", "Cafe", "Salon", "Gym", "Clinic", "Retail", "Agency", "Hotel"];
const DOMAINS = ["gmail.com", "outlook.com", "yahoo.com", "company.com"];

function rand<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

function mockBusinesses(keyword: string, location: string, count: number) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const name = `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} ${rand(["Hub", "Co.", "Studio", "House", "Express", "Lab", "Group", "Place"])} ${i + 1}`;
    const phone = `+1 (${200 + Math.floor(Math.random() * 700)}) ${100 + Math.floor(Math.random() * 800)}-${1000 + Math.floor(Math.random() * 9000)}`;
    const email = Math.random() > 0.2 ? `${slug(name)}@${rand(DOMAINS)}` : null;
    out.push({
      business_name: name,
      phone,
      email,
      website: `https://${slug(name)}.example.com`,
      address: `${100 + Math.floor(Math.random() * 900)} Main St, ${location}`,
      rating: +(3 + Math.random() * 2).toFixed(1),
      category: rand(CATEGORIES),
      source: "scraper" as const,
      source_label: `${keyword} · ${location}`,
    });
  }
  return out;
}

export default function Scraper() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [count, setCount] = useState(20);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState("");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", user!.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user!.id)
        .eq("source", "scraper")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const scrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !location.trim()) return toast.error("Enter keyword and location");
    setRunning(true);
    setProgress(0);
    const batch = mockBusinesses(keyword.trim(), location.trim(), count);
    // simulate progress
    for (let i = 1; i <= 10; i++) {
      await new Promise((r) => setTimeout(r, 180));
      setProgress(i * 10);
    }
    const rows = batch.map((b) => ({ ...b, user_id: user!.id }));
    const { error } = await supabase.from("leads").insert(rows);
    setRunning(false);
    setProgress(0);
    if (error) return toast.error(error.message);
    toast.success(`Scraped ${rows.length} businesses`);
    qc.invalidateQueries({ queryKey: ["leads", user!.id] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["leads", user!.id] });
  };

  const exportCsv = () => {
    if (!filtered.length) return toast.error("Nothing to export");
    const headers = ["business_name", "phone", "email", "website", "address", "rating", "category", "source_label"];
    const csv = [
      headers.join(","),
      ...filtered.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = leads.filter((l) => {
    const q = filter.toLowerCase();
    if (!q) return true;
    return (l.business_name + l.category + l.address + l.email).toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lead Scraper</h1>
        <p className="text-sm text-muted-foreground">Demo Google Maps scraping — generates mock business data.</p>
      </div>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader><CardTitle className="text-base">New search</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={scrape} className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="kw">Keyword</Label>
              <Input id="kw" placeholder="e.g. coffee shops" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="loc">Location</Label>
              <Input id="loc" placeholder="e.g. Austin, TX" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="cnt">Results</Label>
              <Input id="cnt" type="number" min={5} max={100} value={count} onChange={(e) => setCount(parseInt(e.target.value || "20"))} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={running} className="w-full">
                {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scraping…</> : <><Search className="mr-2 h-4 w-4" /> Start scrape</>}
              </Button>
            </div>
          </form>
          {running && <Progress value={progress} className="mt-4" />}
        </CardContent>
      </Card>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Scraped leads ({filtered.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Input placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 w-48" />
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : !filtered.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No leads yet — run a search above.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <div className="font-medium">{l.business_name}</div>
                        <div className="text-xs text-muted-foreground">{l.address}</div>
                      </TableCell>
                      <TableCell>{l.phone}</TableCell>
                      <TableCell>{l.email ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell><Badge variant="secondary">{l.category}</Badge></TableCell>
                      <TableCell>{l.rating}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => remove(l.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
