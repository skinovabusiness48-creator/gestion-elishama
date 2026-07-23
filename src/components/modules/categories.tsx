"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FolderTree,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Category {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  createdAt: string;
  _count?: { products: number };
}

interface CategoryFormValues {
  name: string;
  emoji: string;
  description: string;
}

const EMPTY_FORM: CategoryFormValues = { name: "", emoji: "", description: "" };

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export function CategoriesModule() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire (création / édition)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Category[]>("/api/categories");
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de charger les catégories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({
      name: cat.name,
      emoji: cat.emoji ?? "",
      description: cat.description ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error("Le nom est requis");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        emoji: form.emoji.trim() || null,
        description: form.description.trim() || null,
      };
      if (editing) {
        await apiFetch(`/api/categories/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Catégorie mise à jour");
      } else {
        await apiFetch("/api/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Catégorie créée");
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat: Category) {
    try {
      await apiFetch(`/api/categories/${cat.id}`, { method: "DELETE" });
      toast.success("Catégorie supprimée");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
      throw err;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catégories"
        description="Organisez vos produits par catégories"
        icon={<FolderTree className="h-5 w-5" />}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvelle catégorie
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucune catégorie"
          description="Créez votre première catégorie (Plats, Boissons, ...)"
          icon={<Tags className="h-6 w-6" />}
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Créer une catégorie
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((cat) => {
            const count = cat._count?.products ?? 0;
            return (
              <Card key={cat.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col items-start gap-3 pt-0">
                  <div className="flex w-full items-start justify-between gap-2">
                    <div
                      className={cn(
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-3xl",
                        "bg-primary/10 text-primary",
                      )}
                    >
                      {cat.emoji ? (
                        <span aria-hidden>{cat.emoji}</span>
                      ) : (
                        <Tags className="h-6 w-6" />
                      )}
                    </div>
                    <Badge variant="secondary" className="font-mono tabular-nums">
                      {count} {count > 1 ? "produits" : "produit"}
                    </Badge>
                  </div>
                  <div className="min-w-0 w-full">
                    <h3 className="truncate text-base font-semibold">{cat.name}</h3>
                    {cat.description ? (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {cat.description}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm italic text-muted-foreground/70">
                        Sans description
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      Créée le {formatDate(cat.createdAt)}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(cat)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                        Supprimer
                      </Button>
                    }
                    title="Supprimer la catégorie"
                    description={`Voulez-vous vraiment supprimer la catégorie « ${cat.name} » ? Les produits associés ne seront pas supprimés mais perdront leur catégorie.`}
                    confirmText="Supprimer"
                    onConfirm={() => handleDelete(cat)}
                  />
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* ---------------- Dialogue formulaire ---------------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier la catégorie" : "Nouvelle catégorie"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nom *</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex : Plats, Boissons, Desserts..."
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-emoji">Emoji</Label>
              <Input
                id="cat-emoji"
                value={form.emoji}
                onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                placeholder="Ex : 🍗 (un seul caractère conseillé)"
                maxLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Utilisez un emoji pour identifier rapidement la catégorie.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description optionnelle"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {editing ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
