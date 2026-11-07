import { PriceSource } from "../../generated/prisma/client";
import { prisma } from "../config/prisma";
import { changePercent, toTrend } from "../algorithms/trend";
import { median } from "../algorithms/median";
import { addDays, dateOnly, jakartaDateStr } from "../utils/date";
import { SOURCE_LABEL } from "../utils/labels";

/** City reference price (PIHPS, marketId = null) with 7-day change. */
export async function getReference(commodityId: number) {
  const base = { commodityId, marketId: null, source: "PIHPS" as const };
  const latest = await prisma.price.findFirst({
    where: base,
    orderBy: { date: "desc" },
  });
  if (!latest) return null;

  const prev = await prisma.price.findFirst({
    where: { ...base, date: { lte: addDays(latest.date, -7) } },
    orderBy: { date: "desc" },
  });
  const previousPrice = prev?.price ?? null;
  const pct = previousPrice ? changePercent(latest.price, previousPrice) : 0;

  return {
    price: latest.price,
    previousPrice,
    changePercent: pct,
    trend: toTrend(pct),
    source: latest.source,
    sourceLabel: SOURCE_LABEL[latest.source],
    date: dateOnly(latest.date),
    recordedAt: latest.createdAt,
  };
}

export type EffectivePrice = {
  price: number;
  source: PriceSource;
  date: string;
};

/**
 * Price per (market, commodity):
 * median of CITIZEN reports in the last 72h, otherwise latest SEED estimate.
 * Result: Map<marketId, Map<commodityId, EffectivePrice>>
 */
export async function getEffectivePrices(
  marketIds: number[],
  commodityId?: number
) {
  const result = new Map<number, Map<number, EffectivePrice>>();
  if (marketIds.length === 0) return result;

  const since = new Date(Date.now() - 72 * 3_600_000);
  const extra = commodityId ? { commodityId } : {};
  const [citizen, seed] = await Promise.all([
    prisma.price.findMany({
      where: {
        marketId: { in: marketIds },
        source: "CITIZEN",
        createdAt: { gte: since },
        ...extra,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.price.findMany({
      where: { marketId: { in: marketIds }, source: "SEED", ...extra },
      orderBy: { date: "desc" },
    }),
  ]);

  const put = (m: number, c: number, v: EffectivePrice) => {
    if (!result.has(m)) result.set(m, new Map());
    result.get(m)!.set(c, v);
  };

  // SEED: rows are newest first, keep the first one per (market, commodity)
  const seen = new Set<string>();
  for (const p of seed) {
    const key = `${p.marketId}:${p.commodityId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    put(p.marketId!, p.commodityId, {
      price: p.price,
      source: "SEED",
      date: dateOnly(p.date),
    });
  }

  // CITIZEN overrides SEED when present
  const groups = new Map<string, typeof citizen>();
  for (const p of citizen) {
    const key = `${p.marketId}:${p.commodityId}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  for (const rows of groups.values()) {
    put(rows[0].marketId!, rows[0].commodityId, {
      price: median(rows.map((r) => r.price)),
      source: "CITIZEN",
      date: jakartaDateStr(rows[0].createdAt),
    });
  }

  return result;
}
