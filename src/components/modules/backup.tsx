"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  Database,
  DatabaseBackup,
  Download,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RestoreResponse {
  success: boolean;
  dbRestored: boolean;
  photosRestored: number;
  error?: string;
}

export function BackupModule() {
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleBackup() {
    if (backing) return;
    setBacking(true);
    // Déclenche le téléchargement du ZIP côté serveur via un lien <a download>
    try {
      const a = document.createElement("a");
      a.href = "/api/backup";
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Sauvegarde téléchargée", {
        description: "Archive ZIP générée avec la base et les photos.",
      });
      // Laisse le temps au navigateur d'amorcer le téléchargement
      setTimeout(() => setBacking(false), 1500);
    } catch (err) {
      setBacking(false);
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    }
  }

  function handleRestoreClick() {
    if (!file) {
      toast.error("Veuillez choisir un fichier .zip");
      return;
    }
    setConfirmOpen(true);
  }

  async function doRestore() {
    if (!file) return;
    setRestoring(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/restore", { method: "POST", body: fd });
      const data = (await res.json()) as RestoreResponse;
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de la restauration");
      }
      toast.success("Restauration réussie", {
        description: `Base restaurée · ${data.photosRestored} photo(s) restaurée(s)`,
      });
      setConfirmOpen(false);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Recharge pour appliquer les données restaurées
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la restauration");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sauvegarde & Restauration"
        description="Protégez vos données"
        icon={<DatabaseBackup className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card Sauvegarder */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Download className="h-4 w-4" />
              </div>
              <CardTitle>Sauvegarder</CardTitle>
            </div>
            <CardDescription>
              L&apos;application copie la base de données SQLite et toutes les photos dans une
              archive ZIP nommée{" "}
              <span className="font-medium text-foreground">Sauvegarde_DD_MM_YYYY.zip</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" className="w-full" onClick={handleBackup} disabled={backing}>
              {backing ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Download className="h-5 w-5 mr-2" />
              )}
              {backing ? "Préparation de la sauvegarde..." : "Sauvegarder maintenant"}
            </Button>
          </CardContent>
        </Card>

        {/* Card Restaurer */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <Upload className="h-4 w-4" />
              </div>
              <CardTitle>Restaurer</CardTitle>
            </div>
            <CardDescription>
              Choisissez un fichier de sauvegarde{" "}
              <span className="font-medium text-foreground">.zip</span>.{" "}
              <span className="font-semibold text-destructive">
                ATTENTION :
              </span>{" "}
              toutes les données actuelles seront remplacées par celles de la sauvegarde.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground hover:file:bg-primary/90 file:font-medium cursor-pointer"
            />
            {file && (
              <p className="text-xs text-muted-foreground truncate">
                Fichier sélectionné : <span className="font-medium text-foreground">{file.name}</span>{" "}
                ({(file.size / 1024).toFixed(0)} Ko)
              </p>
            )}
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={handleRestoreClick}
              disabled={restoring || !file}
            >
              {restoring ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Upload className="h-5 w-5 mr-2" />
              )}
              {restoring ? "Restauration en cours..." : "Restaurer"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Card Informations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <CardTitle>Informations</CardTitle>
          </div>
          <CardDescription>
            Ce qui est inclus dans chaque sauvegarde et bonnes pratiques.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Database className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="font-medium">Base de données SQLite</div>
                <p className="text-xs text-muted-foreground">
                  Tous les produits, ventes, dépenses, fournisseurs, entrées de stock,
                  catégories, avis clients.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="font-medium">Photos</div>
                <p className="text-xs text-muted-foreground">
                  Toutes les images uploadées (produits, plats, boissons, reçus de dépenses).
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-sm">
              <div className="font-medium text-amber-800 dark:text-amber-200">Conseils</div>
              <p className="text-amber-700 dark:text-amber-300">
                Effectuez une sauvegarde régulièrement (au moins une fois par semaine) et
                conservez une copie sur un disque externe ou dans le cloud. La restauration
                écrase définitivement les données actuelles.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogue de confirmation */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !restoring && setConfirmOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmer la restauration
            </DialogTitle>
            <DialogDescription>
              ⚠️ Cette action remplacera toutes les données actuelles par celles de la
              sauvegarde. Cette opération est irréversible. Continuer ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={restoring}
            >
              Annuler
            </Button>
            <Button onClick={doRestore} disabled={restoring} variant="destructive">
              {restoring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Oui, restaurer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
