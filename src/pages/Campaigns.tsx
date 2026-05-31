import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Send, Loader2, Sparkles, Users, Search, Eye, Save, Trash2,
  FileText, Wand2, CheckCircle2, X, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type Lead = {
  id: string; business_name: string; email: string | null;
  category: string | null; source: string; phone: string | null;
};

type Template = { id: string; name: string; subject: string; body: string; builtin?: boolean };

const BUILTIN_TEMPLATES: Template[] = [
  { id: "intro", name: "Intro outreach", builtin: true,
    subject: "Quick intro from LeadForge",
    body: "Hi {{business_name}},\n\nI came across your business and thought we could help. Would you be open to a quick 10-min chat this week?\n\nCheers,\nThe Team" },
  { id: "promo", name: "Promotional offer", builtin: true,
    subject: "A special offer for {{business_name}}",
    body: "Hi {{business_name}},\n\nWe're running a limited promotion this month — 20% off our starter plan.\n\nReply to claim it.\n\nThanks!" },
  { id: "followup", name: "Polite follow-up", builtin: true,
    subject: "Following up, {{business_name}}",
    body: "Hi {{business_name}},\n\nJust circling back on my previous note — happy to share more if helpful.\n\nBest," },
  { id: "newsletter", name: "Monthly newsletter", builtin: true,
    subject: "What's new this month at {{business_name}}",
    body: "Hi {{business_name}},\n\nHere are the highlights you don't want to miss:\n\n• New product feature\n• Customer story\n• Upcoming webinar\n\nRead more on our blog." },
];

const TPL_STORAGE = "leadforge:custom-templates";

function loadCustom(): Template[] {
  try { return JSON.parse(localStorage.getItem(TPL_STORAGE) || "[]"); } catch { return []; }
}
function saveCustom(list: Template[]) {
  localStorage.setItem(TPL_STORAGE, JSON.stringify(list));
}

function personalize(text: string, lead?: Lead) {
  const name = lead?.business_name ?? "there";
  return text.replaceAll("{{business_name}}", name);
}

export default function Campaigns() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "scraper" | "csv">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState<null | { count: number }>(null);

  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<Template | null>(null);

  useEffect(() => { setCustomTemplates(loadCustom()); }, []);

  const { data: leads = [] } = useQuery({
    queryKey: ["leads-with-email", user!.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, business_name, email, category, source, phone")
        .eq("user_id", user!.id)
        .not("email", "is", null)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return leads.filter((l) => {
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        l.business_name.toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q) ||
        (l.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, query, sourceFilter]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((l) => next.delete(l.id));
      else filtered.forEach((l) => next.add(l.id));
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const allTemplates = [...BUILTIN_TEMPLATES, ...customTemplates];
  const applyTemplate = (t: Template) => {
    setSubject(t.subject); setBody(t.body);
    toast.success(`Loaded "${t.name}"`);
  };
  const openNewTemplate = () => {
    setEditingTpl({ id: crypto.randomUUID(), name: "", subject, body });
    setTemplateOpen(true);
  };
  const saveTemplate = () => {
    if (!editingTpl) return;
    if (!editingTpl.name.trim() || !editingTpl.subject.trim() || !editingTpl.body.trim()) {
      return toast.error("Name, subject and body required");
    }
    const next = [...customTemplates.filter((t) => t.id !== editingTpl.id), editingTpl];
    setCustomTemplates(next); saveCustom(next);
    setTemplateOpen(false); setEditingTpl(null);
    toast.success("Template saved");
  };
  const deleteTemplate = (id: string) => {
    const next = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(next); saveCustom(next);
    toast.success("Template deleted");
  };

  const previewLead = leads.find((l) => selected.has(l.id)) ?? leads[0];

  const send = async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) return toast.error("Fill campaign details");
    if (selected.size === 0) return toast.error("Select at least one recipient");
    setSending(true); setProgress(0);
    for (let i = 1; i <= 20; i++) {
      await new Promise((r) => setTimeout(r, 90));
      setProgress(i * 5);
    }
    const sent = selected.size;
    const delivered = Math.floor(sent * (0.92 + Math.random() * 0.06));
    const opened = Math.floor(delivered * (0.25 + Math.random() * 0.25));
    const bounced = sent - delivered;
    const { error } = await supabase.from("campaigns").insert({
      user_id: user!.id, name, subject, body, status: "sent",
      recipient_count: sent, sent_count: sent,
      delivered_count: delivered, opened_count: opened, bounced_count: bounced,
      sent_at: new Date().toISOString(),
    });
    setSending(false);
    if (error) { setProgress(0); return toast.error(error.message); }
    setSuccess({ count: sent });
    qc.invalidateQueries({ queryKey: ["campaigns", user!.id] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats", user!.id] });
    setTimeout(() => {
      setSuccess(null); setProgress(0);
      setName(""); setSubject(""); setBody(""); clearSelection();
    }, 2200);
  };

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border p-6"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_top_right,white,transparent_60%)]" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="text-primary-foreground">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider opacity-90">
              <Sparkles className="h-3.5 w-3.5" /> AWS SES · Demo mode
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Bulk Email Campaigns</h1>
            <p className="text-sm opacity-90">Craft, personalize and send beautiful campaigns to your leads.</p>
          </div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="hidden rounded-xl bg-white/15 px-4 py-3 text-primary-foreground backdrop-blur md:block"
          >
            <div className="text-xs uppercase opacity-80">Selected</div>
            <div className="text-2xl font-semibold tabular-nums">{selected.size}</div>
          </motion.div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* LEFT — recipients + templates */}
        <div className="space-y-6">
          <Tabs defaultValue="recipients">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recipients"><Users className="mr-2 h-4 w-4" />Recipients</TabsTrigger>
              <TabsTrigger value="templates"><FileText className="mr-2 h-4 w-4" />Templates</TabsTrigger>
            </TabsList>

            {/* Recipients */}
            <TabsContent value="recipients" className="mt-4">
              <Card style={{ boxShadow: "var(--shadow-card)" }} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="border-b p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {(["all", "scraper", "csv"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSourceFilter(s)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                            sourceFilter === s
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "hover:bg-accent"
                          }`}
                        >
                          {s === "all" ? "All sources" : s === "scraper" ? "Scraped" : "CSV upload"}
                        </button>
                      ))}
                      <div className="ml-auto flex flex-1 items-center gap-2 sm:flex-none">
                        <div className="relative flex-1 sm:w-56">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input value={query} onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search leads…" className="h-9 pl-8" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <label className="flex cursor-pointer items-center gap-2">
                        <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAllFiltered} />
                        <span className="font-medium">
                          {allFilteredSelected ? "Deselect all" : "Select all"}
                          <span className="ml-1 text-muted-foreground">({filtered.length} shown)</span>
                        </span>
                      </label>
                      <AnimatePresence>
                        {selected.size > 0 && (
                          <motion.div
                            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                            className="flex items-center gap-2"
                          >
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" /> {selected.size} selected
                            </Badge>
                            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 px-2 text-xs">
                              <X className="mr-1 h-3 w-3" /> Clear
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <ScrollArea className="h-[420px]">
                    {filtered.length === 0 ? (
                      <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
                        No leads with email — scrape or upload first.
                      </div>
                    ) : (
                      <ul className="divide-y">
                        {filtered.map((l, idx) => {
                          const checked = selected.has(l.id);
                          return (
                            <motion.li
                              key={l.id}
                              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(idx * 0.015, 0.3) }}
                              onClick={() => toggle(l.id)}
                              className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                                checked ? "bg-accent/60" : "hover:bg-accent/30"
                              }`}
                            >
                              <Checkbox checked={checked} onCheckedChange={() => toggle(l.id)}
                                onClick={(e) => e.stopPropagation()} />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">{l.business_name}</div>
                                <div className="truncate text-xs text-muted-foreground">{l.email}</div>
                              </div>
                              <Badge variant="outline" className="hidden sm:inline-flex">
                                {l.source === "scraper" ? "Scraped" : "CSV"}
                              </Badge>
                            </motion.li>
                          );
                        })}
                      </ul>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Templates */}
            <TabsContent value="templates" className="mt-4">
              <Card style={{ boxShadow: "var(--shadow-card)" }}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Click a template to load it into the editor.</p>
                    <Button size="sm" variant="outline" onClick={openNewTemplate}>
                      <Plus className="mr-1 h-4 w-4" /> New template
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {allTemplates.map((t) => (
                      <motion.div
                        key={t.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                        className="group cursor-pointer rounded-lg border p-3 transition-all hover:border-primary hover:shadow-md"
                        onClick={() => applyTemplate(t)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold">{t.name}</span>
                              {t.builtin && <Badge variant="secondary" className="h-4 px-1 text-[10px]">Built-in</Badge>}
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">{t.subject}</div>
                          </div>
                          {!t.builtin && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100"
                              onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT — composer + preview */}
        <div className="space-y-4">
          <Card style={{ boxShadow: "var(--shadow-card)" }}>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label htmlFor="cname">Campaign name</Label>
                <Input id="cname" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Q4 outreach blast" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="subj">Subject</Label>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={openNewTemplate}>
                    <Save className="mr-1 h-3 w-3" /> Save as template
                  </Button>
                </div>
                <Input id="subj" value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder="Use {{business_name}} for personalization" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea id="body" rows={8} value={body} onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email…" className="font-mono text-sm" />
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Wand2 className="h-3 w-3" /> Variables: <code className="rounded bg-muted px-1">{`{{business_name}}`}</code>
                </p>
              </div>

              <AnimatePresence>
                {sending && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Dispatching via SES (demo)…</span>
                        <span className="font-mono tabular-nums">{progress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-background">
                        <motion.div className="h-full"
                          style={{ backgroundImage: "var(--gradient-primary)" }}
                          animate={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  <Mail className="mr-1.5 inline h-4 w-4" />
                  <strong className="text-foreground tabular-nums">{selected.size}</strong> selected recipient{selected.size === 1 ? "" : "s"}
                </p>
                <motion.div whileHover={{ scale: sending || selected.size === 0 ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Button onClick={send} disabled={sending || selected.size === 0}
                    className="relative overflow-hidden"
                    style={{ backgroundImage: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
                    {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                      : <><Send className="mr-2 h-4 w-4" /> Send campaign</>}
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card style={{ boxShadow: "var(--shadow-card)" }} className="overflow-hidden">
            <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
              <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Live preview</span>
              {previewLead && <span className="normal-case">as <strong className="text-foreground">{previewLead.business_name}</strong></span>}
            </div>
            <CardContent className="p-5">
              <div className="text-sm font-semibold">{personalize(subject || "Your subject appears here…", previewLead)}</div>
              <div className="mt-1 text-xs text-muted-foreground">From LeadForge · to {previewLead?.email ?? "lead@example.com"}</div>
              <div className="mt-3 whitespace-pre-wrap rounded-md border bg-background p-3 text-sm leading-relaxed">
                {personalize(body || "Your email body will appear here…", previewLead)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save template dialog */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save as template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editingTpl?.name ?? ""} placeholder="e.g. Cold outreach v2"
                onChange={(e) => setEditingTpl((t) => t ? { ...t, name: e.target.value } : t)} />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={editingTpl?.subject ?? ""}
                onChange={(e) => setEditingTpl((t) => t ? { ...t, subject: e.target.value } : t)} />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea rows={6} value={editingTpl?.body ?? ""}
                onChange={(e) => setEditingTpl((t) => t ? { ...t, body: e.target.value } : t)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateOpen(false)}>Cancel</Button>
            <Button onClick={saveTemplate}><Save className="mr-2 h-4 w-4" /> Save template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success overlay */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-2xl border bg-card p-8 text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
                className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
              </motion.div>
              <h3 className="text-lg font-semibold">Campaign sent!</h3>
              <p className="mt-1 text-sm text-muted-foreground">Dispatched to {success.count} recipient{success.count === 1 ? "" : "s"} (demo).</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
