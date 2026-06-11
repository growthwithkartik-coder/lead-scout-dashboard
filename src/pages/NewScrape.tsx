import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { CategoriesService } from "@/services/categories.service";
import { ScrapeService } from "@/services/scrape.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewScrape() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(50);
  const [categoryId, setCategoryId] = useState(params.get("category") ?? "");

  const cats = useQuery({ queryKey: ["categories"], queryFn: CategoriesService.list });

  const start = useMutation({
    mutationFn: () => ScrapeService.start({ search: search.trim(), total, category_id: categoryId }),
    onSuccess: (job) => {
      toast.success("Scrape job started");
      navigate(`/scrape/${job.job_id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Scrape</h1>
        <p className="text-sm text-muted-foreground">Search Google Maps and store the results into a category.</p>
      </div>
      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader>
          <CardTitle className="text-base">Scrape configuration</CardTitle>
          <CardDescription>Provide a search query and target a category to store the places in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!search.trim()) return toast.error("Enter a search query");
              if (!categoryId) return toast.error("Pick a category");
              start.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Search query</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="restaurants in Mumbai" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Total results</Label>
                <Input type="number" min={1} max={500} value={total} onChange={(e) => setTotal(parseInt(e.target.value || "50"))} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder={cats.isLoading ? "Loading…" : "Pick a category"} /></SelectTrigger>
                  <SelectContent>
                    {(cats.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={start.isPending}>
              {start.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting…</> : <><PlayCircle className="mr-2 h-4 w-4" /> Start scrape</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
