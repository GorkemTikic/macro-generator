---
title: Running Inventory Algorithm (Position Flip Detection)
tags: [concept, algorithm, position]
source: src/components/AverageCalculator.tsx
date: 2026-04-25
status: active
---

# Running Inventory Algorithm

Core algorithm in component [[entities/average-calculator]]. Extracts the **actual** average opening and closing price of the position from Trade History.

## Problem

One user in one day:
1. 1 ETH @ 3000 LONG
2. 0.5 ETH @ 3050 LONG (add)
3. 2 ETH @ 3100 SELL (LONG close + SHORT open = **flip**)
4. 1 ETH @ 3120 BUY (SHORT'tan azaltma)

Question: What is the individual average for this user's LONG closing and SHORT opening?

The naive approach (just the average BUY/SELL price) **gives the wrong answer** — misses the flip point.

## Solution

We browse trades chronologically, we keep **net inventory** (signed quantity):

```
inventory > 0  → LONG pozisyonu açık
inventory < 0  → SHORT pozisyonu açık
inventory = 0  → flat (pozisyon kapalı)
```

For each trade:
- In the same direction (e.g. BUY LONG): weighted addition to the average opening price
- In reverse direction (SELL to LONG): add to closing bucket, reduce inventory
- **FLIP if Inventory changes sign**: close previous position (results closing average), open new position with remaining amount (new opening average)

## Output

Per-position grouping:
- LONG #1 — open avg, close avg, qty
- SHORT #1 — open avg, close avg, qty
- (varsa) IN #2 — …

## Edge case'ler

- **Multiple fills in the same timestamp** → order is ambiguous; AverageCalculator's parser preserves order in file (token based)
- **Position side BOTH** (One-way Mode) → side BUY/SELL'den türetilir
- **Floating-point drift** → 1e-8 epsilon ile flat detection

## Evidence

`src/components/AverageCalculator.tsx` 627 lines — parser + algorithm + bilingual result render. In the README it is stated as "Running Inventory algorithm for precise Position Flip detection".

## Sources

- [[sources/docs/2026-03-21-readme]]

## Related

- [[entities/average-calculator]]
