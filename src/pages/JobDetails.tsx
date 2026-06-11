import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2, AlertTriangle, Radio } from "lucide-react";
import { ScrapeService } from "@/services/scrape.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/csv";
import type { Place } from "@/services/types";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: any; icon: any; label: string }> = {
    running: { variant: "secondary", icon: Loader2, label: "Running" },
    pending: { variant: "secondary", icon: Loader2, label: "Pending" },
    done: { variant: "default", icon: CheckCircle2, label: "Done" },
    error: { variant: "destructive", icon: AlertTriangle, label: "Error" },
  };
  const cfg = map[status] ?? { variant: "outline", icon: Radio, label: status };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="gap-1.5">
      <Icon className={`h-3 w-3 ${status === "running" || status === "pending" ? "animate-spin" : ""}`} />
      {cfg.label}
    </Badge>
  );
}

export default function JobDetails() {
  const { jobId = "" } = useParams();
  const [logs, setLogs] = useState<string[]>([]);
  const [esStatus, setEsStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const logRef = useRef<HTMLDivElement>(null);

  const status = useQuery({
    queryKey: ["job-status", jobId],
    queryFn: () => ScrapeService.status(jobId),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "done" || s === "error" ? false : 5000;
    },
  });

  const isDone = status.data?.status === "done";

  const result = useQuery({
    queryKey: ["job-result", jobId],
    queryFn: () => ScrapeService.result(jobId),
    enabled: !!jobId && isDone,
  });

  // EventSource for live logs
  useEffect(() => {
    if (!jobId) return;
    const es = new EventSource(ScrapeService.streamUrl(jobId));
    setEsStatus("connecting");
    es.onopen = () => setEsStatus("open");
    es.onmessage = (ev) => setLogs((l) => [...l, ev.data]);
    es.onerror = () => setEsStatus("closed");
    return () => { es.close(); setEsStatus("closed"); };
  }, [jobId]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logs]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scrape Job</h1>
          <p className="font-mono text-xs text-muted-foreground">{jobId}</p>
        </div>
        <div className="flex items-center gap-2">
          {status.data && <StatusBadge status={status.data.status} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Live logs</CardTitle>
            <Badge variant={esStatus === "open" ? "default" : esStatus === "closed" ? "destructive" : "secondary"} className="gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${esStatus === "open" ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
              {esStatus}
            </Badge>
          </CardHeader>
          <CardContent>
            <div
              ref={logRef}
              className="h-80 overflow-y-auto rounded-md border bg-muted/30 p-3 font-mono text-xs"
            >
              {logs.length === 0 ? (
                <p className="text-muted-foreground">Waiting for stream…</p>
              ) : (
                logs.map((l, i) => <div key={i} className="whitespace-pre-wrap leading-5">{l}</div>)
              )}
            </div>
          </CardContent>
        </Card>

        <Card style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader><CardTitle className="text-base">Job status</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{status.data?.status ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Message</span><span className="text-right">{status.data?.message ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Polling</span><span>{isDone ? "Stopped" : "Every 5s"}</span></div>
            {isDone && <div className="flex justify-between"><span className="text-muted-foreground">Total results</span><span>{result.data?.total ?? "—"}</span></div>}
          </CardContent>
        </Card>
      </div>

      {isDone && (
        <Card style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Results ({result.data?.results?.length ?? 0})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              disabled={!result.data?.results?.length}
              onClick={() =>
                exportToCsv<Place>(`job-${jobId}.csv`, result.data?.results ?? [], [
                  "name", "address", "website", "phone", "email", "place_type", "rating", "search_query",
                ])
              }
            >
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {result.isLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Loading results…</p>
            ) : !result.data?.results?.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No results returned.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.data.results.map((p, i) => (
                      <TableRow key={p.id ?? i}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm">{p.address}</TableCell>
                        <TableCell className="text-sm">{p.phone || "—"}</TableCell>
                        <TableCell className="text-sm">{p.email || "—"}</TableCell>
                        <TableCell>{p.rating ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
