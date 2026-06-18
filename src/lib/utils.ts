import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency: string = "PGK"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-PG", {
    style: "currency",
    currency,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-PG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatNumber(num: number | string, decimals: number = 2): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  return new Intl.NumberFormat("en-PG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function generateCode(prefix: string, number: number, padding: number = 6): string {
  return `${prefix}${number.toString().padStart(padding, "0")}`;
}
