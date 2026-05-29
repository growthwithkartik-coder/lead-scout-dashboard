import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Campaign history — LeadForge" }] }),
  component: History,
});

function History() {
  const { user } = useAuth();
  const uid = user!.id;
  const { data, isLoading } = useQuery({
    queryKey: ["campaigns", uid],
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("*").eq("user_id", uid).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campaign History</h1>
        <p className="text-sm text-muted-foreground">Demo delivery metrics for every campaign you've sent.</p>
      </div>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader><CardTitle className="text-base">All campaigns</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !data?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No campaigns yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right"><Mail className="ml-auto h-3.5 w-3.5" /></TableHead>
                    <TableHead className="text-right"><CheckCircle2 className="ml-auto h-3.5 w-3.5 text-success" /></TableHead>
                    <TableHead className="text-right"><Eye className="ml-auto h-3.5 w-3.5 text-primary" /></TableHead>
                    <TableHead className="text-right"><AlertCircle className="ml-auto h-3.5 w-3.5 text-destructive" /></TableHead>
                    <TableHead>Sent at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.subject}</div>
                      </TableCell>
                      <TableCell><Badge variant={c.status === "sent" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{c.sent_count}</TableCell>
                      <TableCell className="text-right tabular-nums text-success">{c.delivered_count}</TableCell>
                      <TableCell className="text-right tabular-nums text-primary">{c.opened_count}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">{c.bounced_count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.sent_at ? new Date(c.sent_at).toLocaleString() : "—"}</TableCell>
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
