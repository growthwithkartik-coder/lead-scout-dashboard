import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, Upload, Mail, Activity, LogOut, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">LeadForge</div>
            <div className="text-[10px] text-muted-foreground hidden sm:block">{user?.email}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => { await signOut(); toast.success("Signed out"); navigate("/login", { replace: true }); }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-6">
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
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
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
              <p className="py-8 text-center text-sm text-muted-foreground">No campaigns yet.</p>
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
      </main>
    </div>
  );
}
