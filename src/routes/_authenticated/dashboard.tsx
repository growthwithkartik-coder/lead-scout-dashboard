import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Upload, Mail, Activity } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LeadForge" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const uid = user!.id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", uid],
    queryFn: async () => {
      const [leads, csv, camps] = await Promise.all([
        supabase.from("leads").select("id, created_at, source", { count: "exact" }).eq("user_id", uid),
        supabase.from("csv_uploads").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("campaigns").select("sent_count, name, created_at, status").eq("user_id", uid).order("created_at", { ascending: false }),
      ]);
      const totalSent = (camps.data ?? []).reduce((s, c) => s + (c.sent_count ?? 0), 0);
      const byDay: Record<string, number> = {};
      (leads.data ?? []).forEach((l) => {
        const d = new Date(l.created_at).toISOString().slice(5, 10);
        byDay[d] = (byDay[d] ?? 0) + 1;
      });
      const chart = Object.entries(byDay).slice(-7).map(([day, count]) => ({ day, count }));
      return {
        leadsCount: leads.count ?? 0,
        csvCount: csv.count ?? 0,
        sentCount: totalSent,
        recent: (camps.data ?? []).slice(0, 5),
        chart,
        sourceSplit: [
          { name: "Scraper", v: (leads.data ?? []).filter((l) => l.source === "scraper").length },
          { name: "CSV", v: (leads.data ?? []).filter((l) => l.source === "csv").length },
        ],
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your leads and campaigns</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Leads" value={stats?.leadsCount ?? 0} icon={Users} loading={isLoading} trend="All-time" accent="primary" />
        <StatCard label="CSV Uploads" value={stats?.csvCount ?? 0} icon={Upload} loading={isLoading} trend="Files imported" accent="success" />
        <StatCard label="Emails Sent" value={stats?.sentCount ?? 0} icon={Mail} loading={isLoading} trend="Simulated" accent="warning" />
        <StatCard label="Active Campaigns" value={stats?.recent.filter((c) => c.status !== "draft").length ?? 0} icon={Activity} loading={isLoading} trend="Sent or sending" accent="destructive" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader><CardTitle className="text-base">Leads collected (recent)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.chart ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader><CardTitle className="text-base">Lead sources</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.sourceSplit ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="v" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
        <CardContent>
          {!stats?.recent.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No campaigns yet — create one to see it here.</p>
          ) : (
            <ul className="divide-y">
              {stats.recent.map((c, i) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{c.sent_count} sent</span>
                    <Badge variant={c.status === "sent" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
