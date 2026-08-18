import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatPnL(value: number, currency = "USD"): string {
  const formatted = formatCurrency(Math.abs(value), currency);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

export function calculateRiskReward(
  entry: number,
  stop: number,
  target: number,
  direction: "long" | "short"
): number {
  if (!entry || !stop || !target) return 0;
  const risk =
    direction === "long" ? Math.abs(entry - stop) : Math.abs(stop - entry);
  const reward =
    direction === "long" ? Math.abs(target - entry) : Math.abs(entry - target);
  return risk > 0 ? reward / risk : 0;
}

export function calculateLotSize(
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  stopPrice: number,
  pipValue = 10
): number {
  const riskAmount = accountBalance * (riskPercent / 100);
  const stopDistance = Math.abs(entryPrice - stopPrice);
  if (stopDistance === 0) return 0;
  return riskAmount / (stopDistance * pipValue);
}
