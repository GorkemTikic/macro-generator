import { describe, it, expect } from 'vitest';
import { parseUTC, totalsByType, buildAudit, Row } from './story';

// Helper to create mock rows
const makeRow = (overrides: Partial<Row>): Row => ({
    id: '1', uid: '1', asset: 'USDT', type: 'TRANSFER', amount: 100,
    time: '2023-01-01 12:00:00', ts: 1672574400000, symbol: '', extra: '', raw: '',
    ...overrides
});

describe('story.ts', () => {
    describe('parseUTC', () => {
        it('parses valid UTC date strings correctly', () => {
            // 2023-01-01 12:00:00 UTC
            const ts = parseUTC('2023-01-01 12:00:00');
            expect(ts).toBe(1672574400000);
        });

        it('returns undefined for invalid strings', () => {
            expect(parseUTC('invalid')).toBeUndefined();
            expect(parseUTC('2023/01/01 12:00:00')).toBeUndefined(); // wrong format
        });
    });

    describe('totalsByType', () => {
        it('aggregates amounts by type and asset', () => {
            const rows = [
                makeRow({ type: 'TRANSFER', asset: 'USDT', amount: 100 }),
                makeRow({ type: 'TRANSFER', asset: 'USDT', amount: -50 }),
                makeRow({ type: 'FEE', asset: 'BNB', amount: -0.1 })
            ];

            const res = totalsByType(rows);

            expect(res['TRANSFER']['USDT']).toEqual({ pos: 100, neg: 50, net: 50 });
            expect(res['FEE']['BNB']).toEqual({ pos: 0, neg: 0.1, net: -0.1 });
        });
    });

    describe('buildAudit', () => {
        it('calculates audit correctly with anchor and baseline', () => {
            // Anchor: 1 jan 2023
            const anchorTs = 1672531200000; // 2023-01-01 00:00:00

            const rows = [
                // Before anchor (should be ignored)
                makeRow({ time: '2022-12-31 23:59:59', ts: anchorTs - 1000, amount: 999 }),
                // After anchor
                makeRow({ time: '2023-01-01 01:00:00', ts: anchorTs + 3600000, asset: 'BTC', amount: 1 })
            ];

            const baseline = { "BTC": 10 }; // User says they had 10 BTC before anchor

            // We expect: Baseline (10) + Activity (1) = 11 BTC
            const result = buildAudit(rows, { anchorTs, baseline });

            expect(result).toContain('Baseline (before anchor):');
            expect(result).toContain('BTC 10'); // Display baseline
            expect(result).toContain('Activity after anchor:');
            // Activity
            expect(result).toContain('+1');
            // Net effect
            expect(result).toContain('Net effect (after anchor):');
            expect(result).toContain('BTC  +1');
            // Final balances
            expect(result).toContain('Final expected balances:');
            expect(result).toContain('BTC  11');
        });

        it('applies anchor transfer correctly', () => {
            const anchorTs = 1000;
            const rows = [makeRow({ ts: 2000, asset: 'USDT', amount: 50 })];
            const anchorTransfer = { asset: 'USDT', amount: 100 }; // e.g., initial deposit

            // Baseline 0. Anchor transfer +100. Activity +50. Final = 150.
            const result = buildAudit(rows, { anchorTs, baseline: undefined, anchorTransfer });

            expect(result).toContain('Applied anchor transfer: +100 USDT');
            expect(result).toContain('USDT  +50'); // Net effect
            // Final balances are now always shown (rolling from zero when no baseline).
            expect(result).toContain('Final expected balances');
            expect(result).toContain('USDT  150');
        });

        it('shows final balances if baseline is provided (must be non-empty)', () => {
            const anchorTs = 1000;
            const rows = [makeRow({ ts: 2000, asset: 'USDT', amount: 50 })];
            // Providing a dummy key to satisfy "Object.keys(baseline).length" check in story.ts
            const baseline = { 'USDT': 0 };

            const result = buildAudit(rows, { anchorTs, baseline });

            // Final: 0 + 50 = 50
            expect(result).toContain('Final expected balances:');
            expect(result).toContain('USDT  50');
        });
    });
});
