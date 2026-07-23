"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Loader2,
  MessageSquareWarning,
  Package,
  Pencil,
  Plus,
  RotateCw,
  Tag,
  Trash2,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { cn, formatDate, toInputDate } from "@/lib/utils";

/* ----------------------------- Types ----------------------------- */

interface Feedback {
  id: string;
  itemName: string | null;
  itemType: string | null;
  feedback: string;
  date: string;
  createdAt: string;
}

const NONE = "none";

interface FormState {
  itemName: string;
  itemType: string;
  feedback: string;
  date: string;
}

const EMPTY_FORM: FormState = {
  itemName: "",
  itemType: NONE,
  feedback: "",
  date: toInputDate(new Date()),
};

const TYPE_META: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  dish: {
    label: "Plat",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    icon: <UtensilsCrossed className="h-3 w-3" />,
  },
  drink: {
    label: "Boisson",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    icon: <Wine className="h-3 w-3" />,
  },
  product: {
    label: "Produit",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
    icon: <Package className="h-3 w-3" />,
  },
};

function typeBadge(type: string | null) {
  if (!type || type === NONE) return null;
  const meta = TYPE_META[type];
  if (!meta) return null;
  return (
    <Badge variant="secondary" className={cn("gap-1", meta.className)}>
      {meta.icon}
      {meta.label}
    </Badge>
  );
}

function normalizeItemType(value: string): string | null {
  if (!value || value === NONE) return null;
  return value;
}

/* ----------------------------- Module ----------------------------- */

export function FeedbackModule() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Feedback | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const data = await apiFetch<Feedback[]>("/api/feedback");
      setFeedbacks(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de charger les avis clients",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date: toInputDate(new Date()) });
    setDialogOpen(true);
  }

  function openEdit(item: Feedback) {
    setEditing(item);
    setForm({
      itemName: item.itemName || "",
      itemType: item.itemType || NONE,
      feedback: item.feedback || "",
      date: toInputDate(item.date),
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!form.feedback.trim()) {
      toast.error("Le retour est requis");
      return;
    }
    const payload = {
      itemName: form.itemName.trim() || null,
      itemType: normalizeItemType(form.itemType),
      feedback: form.feedback.trim(),
      date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
    };
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/feedback/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Avis mis à jour");
      } else {
        await apiFetch("/api/feedback", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Avis enregistré");
      }
      setDialogOpen(false);
      await load(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiFetch(`/api/feedback/${id}`, { method: "DELETE" });
      toast.success("Avis supprimé");
      await load(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la suppression",
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avis clients"
        description="Ce que les clients n'aiment pas"
        icon={<MessageSquareWarning className="h-5 w-5" />}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(true)}
              disabled={refreshing}
            >
              <RotateCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouvel avis
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : feedbacks.length === 0 ? (
        <EmptyState
          title="Aucun avis enregistré"
          description="Notez ici ce que les clients n'aiment pas pour améliorer votre carte."
          icon={<MessageSquareWarning className="h-6 w-6" />}
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouvel avis
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {feedbacks.map((f) => {
            const hasItem = !!f.itemName && f.itemName.trim().length > 0;
            return (
              <Card key={f.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          hasItem
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {hasItem ? (
                          <Tag className="h-4 w-4" />
                        ) : (
                          <MessageSquareWarning className="h-4 w-4" />
                        )}
                      </div>
                      <h3
                        className={cn(
                          "truncate font-semibold leading-tight",
                          !hasItem && "text-sm italic text-muted-foreground",
                        )}
                      >
                        {hasItem ? f.itemName : "Avis général"}
                      </h3>
                    </div>
                    {typeBadge(f.itemType)}
                  </div>

                  <p className="line-clamp-6 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {f.feedback}
                  </p>

                  <div className="mt-auto flex items-center justify-between border-t border-border pt-2">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(f.date)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(f)}
                        aria-label="Modifier l'avis"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label="Supprimer l'avis"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                        title="Supprimer cet avis ?"
                        description="Cette action est irréversible."
                        confirmText="Supprimer"
                        onConfirm={() => handleDelete(f.id)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ---------------- Dialogue formulaire ---------------- */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier l'avis" : "Nouvel avis"}
            </DialogTitle>
            <DialogDescription>
              Enregistrez ce que les clients n&apos;aiment pas pour ajuster votre carte.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fb-item">
                Article concerné{" "}
                <span className="text-muted-foreground">(facultatif)</span>
              </Label>
              <Input
                id="fb-item"
                value={form.itemName}
                onChange={(e) =>
                  setForm((s) => ({ ...s, itemName: e.target.value }))
                }
                placeholder="Ex : Kedjenou de poulet, Jus de bissap…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fb-type">
                Type <span className="text-muted-foreground">(facultatif)</span>
              </Label>
              <Select
                value={form.itemType}
                onValueChange={(v) => setForm((s) => ({ ...s, itemType: v }))}
              >
                <SelectTrigger id="fb-type" className="w-full">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Aucun</SelectItem>
                  <SelectItem value="dish">Plat</SelectItem>
                  <SelectItem value="drink">Boisson</SelectItem>
                  <SelectItem value="product">Produit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fb-feedback">
                Retour <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="fb-feedback"
                value={form.feedback}
                onChange={(e) =>
                  setForm((s) => ({ ...s, feedback: e.target.value }))
                }
                placeholder="Ex : Le plat était trop salé, la viande trop dure…"
                rows={4}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fb-date">Date</Label>
              <Input
                id="fb-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
                max={toInputDate(new Date())}
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
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Enregistrer" : "Ajouter l'avis"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
