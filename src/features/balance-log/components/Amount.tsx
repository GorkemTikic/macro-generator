import React from "react";
import { fmtTrim } from "../lib/format";

type AmountValue = number | string | null | undefined;

function signOf(value: AmountValue) {
  if (value === null || value === undefined) return 0;
  const raw = String(value).trim();
  if (!raw || raw === "-" || raw === "\u2014") return 0;
  const n = Number(raw.replace(/^\u2212/, "-"));
  if (Number.isFinite(n)) {
    if (Math.abs(n) < 1e-12) return 0;
    return n > 0 ? 1 : -1;
  }
  if (/^[-\u2212]/.test(raw)) return -1;
  if (/^\+/.test(raw)) return 1;
  return 0;
}

function signedAmountClass(value: AmountValue) {
  const sign = signOf(value);
  if (sign > 0) return "signed-amount signed-positive";
  if (sign < 0) return "signed-amount signed-negative";
  return "signed-amount signed-zero";
}

function defaultDisplay(value: AmountValue, showPlus: boolean) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") {
    const prefix = showPlus && value > 0 ? "+" : "";
    return `${prefix}${fmtTrim(value)}`;
  }
  const raw = value.trim();
  if (showPlus && signOf(raw) > 0 && !raw.startsWith("+")) return `+${raw}`;
  return raw;
}

/** Color any signed amount consistently across the app. */
export default function Amount({
  value,
  showPlus = false,
  displayValue,
  className = "",
  bold = false
}: {
  value: AmountValue;
  showPlus?: boolean;
  displayValue?: string;
  className?: string;
  bold?: boolean;
}) {
  const classes = `${signedAmountClass(value)} ${className}`.trim();
  return (
    <span className={classes} style={{ fontWeight: bold ? 700 : undefined }}>
      {displayValue ?? defaultDisplay(value, showPlus)}
    </span>
  );
}
