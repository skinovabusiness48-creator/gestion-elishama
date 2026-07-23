"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
  className?: string;
}

const toneStyles: Record<string, string> = {
  default: "text-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-destructive",
  primary: "text-primary",
};

const iconBg: Record<string, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  danger: "bg-red-100 text-destructive dark:bg-red-950",
  primary: "bg-primary/10 text-primary",
};

export function StatCard({ label, value, icon, hint, tone = "default", className }: Props) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={cn("mt-1 text-xl sm:text-2xl font-bold truncate", toneStyles[tone])}>{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          {icon && <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", iconBg[tone])}>{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
