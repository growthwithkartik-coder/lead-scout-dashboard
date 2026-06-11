import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, FolderKanban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CategoriesService } from "@/services/categories.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Categories() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["categories"],
    queryFn: CategoriesService.list,
  });

  const create = useMutation({
    mutationFn: () => CategoriesService.create({ name: name.trim(), description: desc.trim() }),
    onSuccess: () => {
      toast.success("Category created");
      setName(""); setDesc(""); setOpen(false);
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => CategoriesService.remove(id),
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">Group your scraped places into logical buckets.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create category</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Restaurants" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Food places" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader><CardTitle className="text-base">All categories</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-destructive">Could not reach the API.</p>
          ) : !data?.length ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <FolderKanban className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No categories yet — create your first one.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Total Places</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Scraped</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link to={`/categories/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.description || "—"}</TableCell>
                    <TableCell>{c.total_places ?? 0}</TableCell>
                    <TableCell className="text-sm">{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-sm">{c.last_scraped ? new Date(c.last_scraped).toLocaleString() : "—"}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete <b>{c.name}</b>. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(c.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
