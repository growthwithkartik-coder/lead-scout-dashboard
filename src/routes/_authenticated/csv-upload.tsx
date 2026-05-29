import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/csv-upload")({
  head: () => ({ meta: [{ title: "CSV Upload — LeadForge" }] }),
  component: CsvUpload,
});

const REQUIRED = ["business_name"];

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return { headers: [], rows: [] as Record<string, string>[] };
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (c === "," && !inQ) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = split(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const rows = lines.slice(1).map((line) => {
    const vals = split(line);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""])) as Record<string, string>;
  });
  return { headers, rows };
}

function CsvUpload() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  const uploadsQ = useQuery({
    queryKey: ["uploads", uid],
    queryFn: async () => {
      const { data } = await supabase.from("csv_uploads").select("*").eq("user_id", uid).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const leadsQ = useQuery({
    queryKey: ["leads", uid, "csv"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("*").eq("user_id", uid).eq("source", "csv").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const { headers, rows } = parseCsv(text);
      const missing = REQUIRED.filter((c) => !headers.includes(c));
      if (missing.length) throw new Error(`CSV must include columns: ${REQUIRED.join(", ")}`);
      const inserts = rows.filter((r) => r.business_name).map((r) => ({
        user_id: uid,
        business_name: r.business_name,
        phone: r.phone || null,
        email: r.email || null,
        website: r.website || null,
        address: r.address || null,
        rating: r.rating ? Number(r.rating) : null,
        category: r.category || null,
        source: "csv",
        source_label: file.name,
      }));
      if (!inserts.length) throw new Error("No valid rows found");
      const { error } = await supabase.from("leads").insert(inserts);
      if (error) throw error;
      const { error: e2 } = await supabase.from("csv_uploads").insert({ user_id: uid, filename: file.name, row_count: inserts.length });
      if (e2) throw e2;
      return inserts.length;
    },
    onSuccess: (n) => {
      toast.success(`Imported ${n} leads`);
      qc.invalidateQueries({ queryKey: ["uploads", uid] });
      qc.invalidateQueries({ queryKey: ["leads", uid, "csv"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delLead = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("leads").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["leads", uid, "csv"] }); },
  });

  const editLead = useMutation({
    mutationFn: async ({ id, business_name }: { id: string; business_name: string }) => {
      const { error } = await supabase.from("leads").update({ business_name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["leads", uid, "csv"] }); },
  });

  const filtered = (leadsQ.data ?? []).filter((l) =>
    !search || `${l.business_name} ${l.email ?? ""} ${l.source_label ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CSV Upload</h1>
        <p className="text-sm text-muted-foreground">Bring your own leads. Required column: <code className="rounded bg-muted px-1">business_name</code>. Optional: phone, email, website, address, rating, category.</p>
      </div>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardContent className="p-6">
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) upload.mutate(f); }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-10 text-center transition hover:bg-muted/50"
          >
            <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drop your CSV here or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">Max 5MB · UTF-8 encoded</p>
            <input
              ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1" style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader><CardTitle className="text-base">Recent uploads</CardTitle></CardHeader>
          <CardContent>
            {!(uploadsQ.data ?? []).length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No uploads yet</p>
            ) : (
              <ul className="space-y-3">
                {uploadsQ.data!.map((u) => (
                  <li key={u.id} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                    <FileText className="mt-0.5 h-4 w-4 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{u.filename}</p>
                      <p className="text-xs text-muted-foreground">{u.row_count} rows · {new Date(u.created_at).toLocaleDateString()}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Imported leads ({filtered.length})</CardTitle>
            <Input placeholder="Search…" className="w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
          </CardHeader>
          <CardContent>
            {!filtered.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No imported leads yet</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Source file</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 20).map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <Input
                            defaultValue={l.business_name}
                            onBlur={(e) => { if (e.target.value !== l.business_name) editLead.mutate({ id: l.id, business_name: e.target.value }); }}
                            className="h-8 border-0 bg-transparent px-1 focus-visible:bg-muted"
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{l.email || "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{l.source_label}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => delLead.mutate(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
    </div>
  );
}
