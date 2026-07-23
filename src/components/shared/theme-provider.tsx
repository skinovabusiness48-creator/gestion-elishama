"use client";

import * as React from "react";

type Theme = "dark" | "light" | "system";

interface Props {
  children: React.ReactNode;
  attribute?: "class" | "data-theme";
  defaultTheme?: Theme;
  enableSystem?: boolean;
}

export function ThemeProvider({ children, attribute = "class", defaultTheme = "light", enableSystem = true }: Props) {
  React.useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("elishama-theme")) as Theme | null;
    let theme: Theme = stored || defaultTheme;
    if (theme === "system" && enableSystem) {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    const root = document.documentElement;
    if (attribute === "class") {
      root.classList.remove("light", "dark");
      root.classList.add(theme);
    } else {
      root.setAttribute("data-theme", theme);
    }
  }, [attribute, defaultTheme, enableSystem]);

  return <>{children}</>;
}

export function useTheme() {
  const setTheme = (theme: Theme) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("elishama-theme", theme);
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(resolved);
    } else {
      root.classList.add(theme);
    }
  };
  const toggle = () => {
    if (typeof window === "undefined") return;
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  };
  return { setTheme, toggle };
}
