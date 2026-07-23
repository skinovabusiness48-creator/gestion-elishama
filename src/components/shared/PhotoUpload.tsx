"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch, photoUrl } from "@/lib/api";

interface Props {
  value?: string | null;
  onChange: (path: string | null) => void;
  className?: string;
  label?: string;
}

export function PhotoUpload({ value, onChange, className, label = "Photo" }: Props) {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch<{ path: string }>("/api/upload", { method: "POST", body: fd as any });
      onChange(res.path);
    } catch (e: any) {
      alert(e.message || "Erreur lors de l'upload");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="text-sm font-medium">{label}</label>}
      <div className="flex items-center gap-3">
        <div
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center cursor-pointer hover:border-primary/60 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          {value ? (
            <img src={photoUrl(value)} alt="aperçu" className="h-full w-full object-cover" />
          ) : loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <button type="button" onClick={() => inputRef.current?.click()} className="text-sm text-primary hover:underline">
            {value ? "Changer la photo" : "Choisir une photo"}
          </button>
          {value && (
            <button type="button" onClick={() => onChange(null)} className="text-xs text-destructive hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> Retirer
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
