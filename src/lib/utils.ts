import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatage des montants en FCFA
export function formatMoney(value: number): string {
  const v = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(v) + " FCFA"
}

export function formatNumber(value: number): string {
  const v = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(v)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function startOfDay(d: Date): Date {
  const n = new Date(d)
  n.setHours(0, 0, 0, 0)
  return n
}

export function endOfDay(d: Date): Date {
  const n = new Date(d)
  n.setHours(23, 59, 59, 999)
  return n
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  const da = typeof a === "string" ? new Date(a) : a
  const db = typeof b === "string" ? new Date(b) : b
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

export function toInputDate(d: Date | string): string {
  const da = typeof d === "string" ? new Date(d) : d
  const tz = da.getTimezoneOffset() * 60000
  return new Date(da.getTime() - tz).toISOString().slice(0, 10)
}

export function toInputDateTime(d: Date | string): string {
  const da = typeof d === "string" ? new Date(d) : d
  const tz = da.getTimezoneOffset() * 60000
  return new Date(da.getTime() - tz).toISOString().slice(0, 16)
}
