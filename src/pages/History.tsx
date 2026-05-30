import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function History() {
  const { user } = useAuth();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", user!.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campaign History</h1>
        <p className="text-sm text-muted-foreground">Delivery stats are mocked for demo purposes.</p>
      </div>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader><CardTitle className="text-base">All campaigns ({campaigns.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : !campaigns.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No campaigns yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Opened</TableHead>
                    <TableHead className="text-right">Bounced</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.subject}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === "sent" ? "default" : "secondary"}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{c.sent_count}</TableCell>
                      <TableCell className="text-right">{c.delivered_count}</TableCell>
                      <TableCell className="text-right">{c.opened_count}</TableCell>
                      <TableCell className="text-right">{c.bounced_count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.sent_at ? new Date(c.sent_at).toLocaleString() : new Date(c.created_at).toLocaleString()}
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
