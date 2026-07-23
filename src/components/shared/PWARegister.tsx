"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // N'enregistrer qu'en production OU si le SW est déjà enregistré (évite casser le dev HMR)
    const isProd = process.env.NODE_ENV === "production";
    if (!isProd) {
      // En dev, on enregistre quand même pour permettre le test d'installation PWA
      // mais on désactive le caching agressif via le SW lui-même (qui ne cache pas les chunks Next)
    }
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("SW registration failed:", err);
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
