import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const REQUIRED = ["business_name"];
const OPTIONAL = ["phone", "email", "website", "address", "rating", "category"];

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
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
  const headers = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = split(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

export default function CsvUpload() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("");

  const { data: leads = [] } = useQuery({
    queryKey: ["csv-leads", user!.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user!.id)
        .eq("source", "csv")
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) return toast.error("CSV is empty");
      const headers = Object.keys(rows[0]);
      const missing = REQUIRED.filter((r) => !headers.includes(r));
      if (missing.length) return toast.error(`Missing required columns: ${missing.join(", ")}`);

      const inserts = rows.map((r) => {
        const lead: any = { user_id: user!.id, source: "csv", source_label: file.name, business_name: r.business_name };
        OPTIONAL.forEach((k) => { if (r[k]) lead[k] = k === "rating" ? parseFloat(r[k]) || null : r[k]; });
        return lead;
      }).filter((l) => l.business_name);

      const { error: e1 } = await supabase.from("leads").insert(inserts);
      if (e1) throw e1;
      await supabase.from("csv_uploads").insert({ user_id: user!.id, filename: file.name, row_count: inserts.length });
      toast.success(`Imported ${inserts.length} rows from ${file.name}`);
      qc.invalidateQueries({ queryKey: ["csv-leads", user!.id] });
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["csv-leads", user!.id] });
  };

  const filtered = leads.filter((l) =>
    !filter ? true : (l.business_name + (l.email ?? "") + (l.phone ?? "")).toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CSV Upload</h1>
        <p className="text-sm text-muted-foreground">Manual lead import. Required column: business_name. Optional: phone, email, website, address, rating, category.</p>
      </div>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader><CardTitle className="text-base">Upload file</CardTitle></CardHeader>
        <CardContent>
          <label
            htmlFor="file"
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center cursor-pointer hover:bg-accent/30 transition"
          >
            <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">{uploading ? "Uploading…" : "Click to choose a .csv file"}</p>
            <p className="mt-1 text-xs text-muted-foreground">UTF-8, comma-separated</p>
            <Input
              ref={fileRef}
              id="file"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        </CardContent>
      </Card>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Imported leads ({filtered.length})</CardTitle>
          <Input placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 w-48" />
        </CardHeader>
        <CardContent>
          {!filtered.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No uploads yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Source file</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.business_name}</TableCell>
                      <TableCell>{l.email ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{l.phone ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{l.source_label}</TableCell>
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
