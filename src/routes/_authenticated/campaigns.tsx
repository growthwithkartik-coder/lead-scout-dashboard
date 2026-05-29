import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Mail, Bold, Italic, Link as LinkIcon, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — LeadForge" }] }),
  component: Campaigns,
});

const TEMPLATES = [
  { name: "Cold outreach", subject: "Quick question about {{business_name}}", body: "Hi there,\n\nI came across {{business_name}} and wanted to reach out. We help businesses like yours grow with…\n\nWould you be open to a quick call this week?\n\nThanks!" },
  { name: "Follow-up", subject: "Following up", body: "Hi,\n\nJust circling back on my last note — would love to hear your thoughts.\n\nBest," },
  { name: "Promo", subject: "20% off this month for {{business_name}}", body: "Hi,\n\nWe're offering an exclusive 20% discount this month. Reply to claim yours.\n\nCheers!" },
];

function Campaigns() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();

  const [name, setName] = useState("New campaign");
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [body, setBody] = useState(TEMPLATES[0].body);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);

  const leadsQ = useQuery({
    queryKey: ["leads-all", uid],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("id, business_name, email, source").eq("user_id", uid).not("email", "is", null).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const eligible = leadsQ.data ?? [];
  const allSelected = useMemo(() => eligible.length > 0 && selected.size === eligible.length, [eligible, selected]);

  const send = useMutation({
    mutationFn: async () => {
      if (!subject.trim() || !body.trim()) throw new Error("Subject and body are required");
      if (selected.size === 0) throw new Error("Select at least one recipient");
      setSending(true); setProgress(0);
      const { data: camp, error } = await supabase.from("campaigns").insert({
        user_id: uid, name, subject, body,
        recipient_count: selected.size, status: "sending",
      }).select().single();
      if (error || !camp) throw error || new Error("Failed");
      const steps = 25;
      for (let i = 1; i <= steps; i++) {
        await new Promise((r) => setTimeout(r, 60));
        setProgress(Math.round((i / steps) * 100));
      }
      const sent = selected.size;
      const delivered = Math.round(sent * 0.94);
      const opened = Math.round(delivered * 0.42);
      const bounced = sent - delivered;
      await supabase.from("campaigns").update({
        status: "sent", sent_at: new Date().toISOString(),
        sent_count: sent, delivered_count: delivered, opened_count: opened, bounced_count: bounced,
      }).eq("id", camp.id);
      return sent;
    },
    onSuccess: (n) => {
      setSending(false); setProgress(0);
      toast.success(`Simulated send to ${n} recipients`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["campaigns", uid] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats", uid] });
    },
    onError: (e: Error) => { setSending(false); setProgress(0); toast.error(e.message); },
  });

  const wrap = (tag: string) => {
    const ta = document.getElementById("body-area") as HTMLTextAreaElement | null;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = body.slice(s, e) || "text";
    const marker = tag === "b" ? "**" : tag === "i" ? "_" : "";
    const replacement = tag === "a" ? `[${sel}](https://)` : `${marker}${sel}${marker}`;
    setBody(body.slice(0, s) + replacement + body.slice(e));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email Campaigns</h1>
          <p className="text-sm text-muted-foreground">Compose and simulate bulk sends. <Link to="/history" className="text-primary hover:underline">View history →</Link></p>
        </div>
        <Badge variant="secondary" className="bg-warning/15 text-warning-foreground">Demo · No real emails sent</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader><CardTitle className="text-base">Compose</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Campaign name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Message</Label>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => wrap("b")}><Bold className="h-3.5 w-3.5" /></Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => wrap("i")}><Italic className="h-3.5 w-3.5" /></Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => wrap("a")}><LinkIcon className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <Textarea id="body-area" rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">Use <code className="rounded bg-muted px-1">{`{{business_name}}`}</code> for personalization.</p>
            </div>
            <div className="space-y-2">
              <Label>Templates</Label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <Button key={t.name} type="button" variant="outline" size="sm" onClick={() => { setSubject(t.subject); setBody(t.body); }}>{t.name}</Button>
                ))}
              </div>
            </div>

            {sending && (
              <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center gap-2 text-sm"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Simulating delivery…</div>
                <Progress value={progress} />
              </div>
            )}

            <Button onClick={() => send.mutate()} disabled={sending || selected.size === 0} className="w-full gap-2" size="lg">
              <Send className="h-4 w-4" /> Send to {selected.size} recipient{selected.size === 1 ? "" : "s"}
            </Button>
          </CardContent>
        </Card>

        <Card style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Recipients</span>
              {eligible.length > 0 && (
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => setSelected(allSelected ? new Set() : new Set(eligible.map((l) => l.id)))}
                >{allSelected ? "Clear" : "Select all"}</button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!eligible.length ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Mail className="mx-auto mb-2 h-6 w-6 opacity-50" />
                No leads with email yet.<br />
                <Link to="/scraper" className="text-primary hover:underline">Scrape some</Link> or <Link to="/csv-upload" className="text-primary hover:underline">upload a CSV</Link>.
              </div>
            ) : (
              <ul className="max-h-96 space-y-1 overflow-y-auto">
                {eligible.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                    <Checkbox
                      checked={selected.has(l.id)}
                      onCheckedChange={(c) => {
                        const next = new Set(selected);
                        c ? next.add(l.id) : next.delete(l.id);
                        setSelected(next);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{l.business_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{l.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
