import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowRight, Search, Upload, Mail, BarChart3, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LeadForge — Lead Scraping & Bulk Mailing (Demo)" },
      { name: "description", content: "Demo SaaS for scraping business leads, uploading CSVs, and sending bulk email campaigns." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold">LeadForge</span>
            <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-warning-foreground">Demo</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link to="/login">Log in</Link></Button>
            <Button asChild><Link to="/register">Get started</Link></Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Educational demo — no real scraping or email sending
        </div>
        <h1 className="mx-auto max-w-3xl text-5xl font-semibold tracking-tight md:text-6xl">
          Scrape leads, upload CSVs, send <span style={{ background: "var(--gradient-primary)", WebkitBackgroundClip: "text", color: "transparent" }}>bulk campaigns.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          A full SaaS reference app showing lead generation, CSV management, and email campaign workflows — built end-to-end for learning.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg" className="gap-2"><Link to="/register">Start free demo <ArrowRight className="h-4 w-4" /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/login">Sign in</Link></Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-3">
        {[
          { i: Search, t: "Maps Scraper", d: "Search businesses by keyword & location. Demo data only." },
          { i: Upload, t: "CSV Upload", d: "Bring your own leads. Validate, edit, and store securely." },
          { i: Mail, t: "Bulk Email", d: "Build campaigns, choose recipients, simulate sends." },
          { i: BarChart3, t: "Analytics", d: "Track total leads, sent emails, and recent activity." },
          { i: Shield, t: "Per-user data", d: "Row-level security keeps each account isolated." },
          { i: Sparkles, t: "Modern UI", d: "Sidebar, dark mode, toasts, skeletons — fully responsive." },
        ].map((f) => (
          <div key={f.t} className="rounded-xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary"><f.i className="h-4 w-4" /></div>
            <h3 className="font-semibold">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
