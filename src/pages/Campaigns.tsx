import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TEMPLATES: Record<string, { subject: string; body: string }> = {
  intro: {
    subject: "Quick intro from LeadForge",
    body: "Hi {{business_name}},\n\nI came across your business and thought we could help. Would you be open to a quick chat?\n\nThanks!",
  },
  promo: {
    subject: "A special offer for {{business_name}}",
    body: "Hi {{business_name}},\n\nWe're running a limited promotion this month. Reply to claim it.\n\nCheers,",
  },
  followup: {
    subject: "Following up",
    body: "Hi {{business_name}},\n\nJust circling back on my previous note — happy to share more if helpful.\n\nBest,",
  },
};

export default function Campaigns() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "scraper" | "csv">("all");
  const [sending, setSending] = useState(false);

  const { data: recipientCount = 0 } = useQuery({
    queryKey: ["recipient-count", user!.id, audience],
    queryFn: async () => {
      let q = supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", user!.id).not("email", "is", null);
      if (audience !== "all") q = q.eq("source", audience);
      const { count } = await q;
      return count ?? 0;
    },
  });

  const applyTemplate = (key: string) => {
    const t = TEMPLATES[key];
    if (t) { setSubject(t.subject); setBody(t.body); }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !body.trim()) return toast.error("Fill all fields");
    if (!recipientCount) return toast.error("No recipients with email in selected audience");
    setSending(true);

    // mock send via AWS SES (demo only)
    await new Promise((r) => setTimeout(r, 1500));
    const sent = recipientCount;
    const delivered = Math.floor(sent * (0.92 + Math.random() * 0.06));
    const opened = Math.floor(delivered * (0.25 + Math.random() * 0.25));
    const bounced = sent - delivered;

    const { error } = await supabase.from("campaigns").insert({
      user_id: user!.id,
      name, subject, body,
      status: "sent",
      recipient_count: sent,
      sent_count: sent,
      delivered_count: delivered,
      opened_count: opened,
      bounced_count: bounced,
      sent_at: new Date().toISOString(),
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Campaign sent to ${sent} recipients (demo)`);
    setName(""); setSubject(""); setBody("");
    qc.invalidateQueries({ queryKey: ["campaigns", user!.id] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats", user!.id] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bulk Email Campaigns</h1>
        <p className="text-sm text-muted-foreground">Demo bulk mailer using AWS SES (simulated). No real emails are sent.</p>
      </div>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader><CardTitle className="text-base">New campaign</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={send} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Q4 Outreach" />
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All leads ({recipientCount} with email)</SelectItem>
                    <SelectItem value="scraper">Scraped only</SelectItem>
                    <SelectItem value="csv">CSV uploads only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              <Select onValueChange={applyTemplate}>
                <SelectTrigger><SelectValue placeholder="Start from template…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="intro">Intro</SelectItem>
                  <SelectItem value="promo">Promotion</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Use {{business_name}} for personalization" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea id="body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your email…" />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                <Mail className="mr-2 inline h-4 w-4" />
                {recipientCount} recipients will receive this email
              </p>
              <Button type="submit" disabled={sending}>
                {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : <><Send className="mr-2 h-4 w-4" /> Send campaign</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
