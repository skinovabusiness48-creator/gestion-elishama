"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  MapPin,
  PackagePlus,
  Pencil,
  Phone,
  Plus,
  RotateCw,
  Trash2,
  Truck,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { cn, formatDate, formatNumber } from "@/lib/utils";

/* ----------------------------- Types ----------------------------- */

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  description: string | null;
  createdAt: string;
  _count?: { stockEntries: number };
}

interface FormState {
  name: string;
  phone: string;
  address: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: "", phone: "", address: "", description: "" };

/* ----------------------------- Module ----------------------------- */

export function SuppliersModule() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const data = await apiFetch<Supplier[]>("/api/suppliers");
      setSuppliers(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de charger les fournisseurs",
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
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name: s.name || "",
      phone: s.phone || "",
      address: s.address || "",
      description: s.description || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!form.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      description: form.description.trim() || null,
    };
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/suppliers/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Fournisseur mis à jour");
      } else {
        await apiFetch("/api/suppliers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Fournisseur créé");
      }
      setDialogOpen(false);
      await load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiFetch(`/api/suppliers/${id}`, { method: "DELETE" });
      toast.success("Fournisseur supprimé");
      await load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fournisseurs"
        description="Gérez vos partenaires d'approvisionnement"
        icon={<Truck className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
              <RotateCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouveau fournisseur
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
      ) : suppliers.length === 0 ? (
        <EmptyState
          title="Aucun fournisseur"
          description="Ajoutez votre premier fournisseur pour suivre vos approvisionnements."
          icon={<Truck className="h-6 w-6" />}
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouveau fournisseur
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => {
            const entryCount = s._count?.stockEntries ?? 0;
            return (
              <Card key={s.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Truck className="h-4 w-4" />
                      </div>
                      <h3 className="truncate font-semibold leading-tight">{s.name}</h3>
                    </div>
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <PackagePlus className="h-3 w-3" />
                      {formatNumber(entryCount)} entrée{entryCount > 1 ? "s" : ""}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    {s.phone ? (
                      <a
                        href={`tel:${s.phone}`}
                        className="flex items-center gap-2 text-foreground transition-colors hover:text-primary hover:underline"
                      >
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{s.phone}</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground/60">
                        <Phone className="h-4 w-4" />
                        <span className="text-xs italic">Téléphone non renseigné</span>
                      </div>
                    )}
                    {s.address ? (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0">{s.address}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground/60">
                        <MapPin className="h-4 w-4" />
                        <span className="text-xs italic">Adresse non renseignée</span>
                      </div>
                    )}
                  </div>

                  {s.description && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{s.description}</p>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      Depuis le {formatDate(s.createdAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(s)}
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                        title="Supprimer le fournisseur ?"
                        description="Cette action est irréversible. Les entrées de stock associées conserveront le nom du fournisseur."
                        confirmText="Supprimer"
                        onConfirm={() => handleDelete(s.id)}
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
              {editing ? "Modifier le fournisseur" : "Nouveau fournisseur"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Mettez à jour les coordonnées du fournisseur."
                : "Renseignez les coordonnées de votre nouveau fournisseur."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sup-name">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sup-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex : Bralima Distribution"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-phone">Téléphone</Label>
              <Input
                id="sup-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Ex : +243 970 000 000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-address">Adresse</Label>
              <Input
                id="sup-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Ex : Avenue de la Paix, Kinshasa"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-desc">Description</Label>
              <Textarea
                id="sup-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Notes : produits livrés, conditions de paiement…"
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
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? "Mettre à jour" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
