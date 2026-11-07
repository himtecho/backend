import { Market } from "../../generated/prisma/client";
import { prisma } from "../config/prisma";
import { boundingBox, haversineKm, round1 } from "../algorithms/geo";
import { addDays, dateOnly, toJakartaIso } from "../utils/date";
import { SOURCE_LABEL } from "../utils/labels";
import { ApiError } from "../utils/response";
import { getEffectivePrices, getReference } from "./price.service";

async function mustFindCommodity(id: number) {
  const c = await prisma.commodity.findUnique({ where: { id } });
  if (!c) throw new ApiError(404, "NOT_FOUND", "Commodity not found");
  return c;
}

export async function listCommodities() {
  const rows = await prisma.commodity.findMany({ orderBy: { id: "asc" } });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    unit: c.unit,
    iconUrl: c.iconUrl,
  }));
}

export async function getCommodity(id: number) {
  const c = await mustFindCommodity(id);
  const ref = await getReference(id);
  if (!ref)
    throw new ApiError(
      404,
      "NOT_FOUND",
      "No reference price for this commodity"
    );
  return {
    id: c.id,
    name: c.name,
    unit: c.unit,
    iconUrl: c.iconUrl,
    price: ref.price,
    changePercent: ref.changePercent,
    trend: ref.trend,
    source: ref.source,
    sourceLabel: ref.sourceLabel,
    date: ref.date,
  };
}

export async function priceSummary() {
  const commodities = await prisma.commodity.findMany({
    orderBy: { id: "asc" },
  });
  const rows = await Promise.all(
    commodities.map(async (c) => {
      const ref = await getReference(c.id);
      if (!ref) return null;
      return {
        recordedAt: ref.recordedAt,
        item: {
          commodityId: c.id,
          name: c.name,
          unit: c.unit,
          iconUrl: c.iconUrl,
          price: ref.price,
          previousPrice: ref.previousPrice ?? ref.price,
          changePercent: ref.changePercent,
          trend: ref.trend,
          source: ref.source,
          sourceLabel: ref.sourceLabel,
          date: ref.date,
        },
      };
    })
  );
  const valid = rows.filter((r): r is NonNullable<typeof r> => r !== null);
  const items = valid.map((r) => r.item);
  const latest = valid.reduce<Date | null>(
    (acc, r) => (!acc || r.recordedAt > acc ? r.recordedAt : acc),
    null
  );

  return {
    updatedAt: toJakartaIso(latest ?? new Date()),
    items,
    topRisers: items
      .filter((i) => i.trend === "UP")
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 2),
    topFallers: items
      .filter((i) => i.trend === "DOWN")
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 2),
  };
}

export async function commodityHistory(id: number, days: 7 | 30) {
  const c = await mustFindCommodity(id);
  const base = { commodityId: id, marketId: null, source: "PIHPS" as const };
  const latest = await prisma.price.findFirst({
    where: base,
    orderBy: { date: "desc" },
  });
  if (!latest)
    return { commodityId: id, unit: c.unit, points: [], stats: null };

  const rows = await prisma.price.findMany({
    where: { ...base, date: { gte: addDays(latest.date, -(days - 1)) } },
    orderBy: [{ date: "asc" }, { createdAt: "desc" }],
  });

  // one point per day
  const byDate = new Map<string, number>();
  for (const r of rows) {
    const d = dateOnly(r.date);
    if (!byDate.has(d)) byDate.set(d, r.price);
  }
  const points = [...byDate.entries()].map(([date, price]) => ({
    date,
    price,
  }));

  let min = points[0];
  let max = points[0];
  let sum = 0;
  for (const p of points) {
    if (p.price < min.price) min = p;
    if (p.price >= max.price) max = p; // ties: most recent
    sum += p.price;
  }

  return {
    commodityId: id,
    unit: c.unit,
    points,
    stats: {
      min: min.price,
      minDate: min.date,
      max: max.price,
      maxDate: max.date,
      average: Math.round(sum / points.length),
    },
  };
}

export async function commodityMarkets(
  id: number,
  q: { lat?: number; lon?: number; radius: number; limit: number }
) {
  await mustFindCommodity(id);
  const reference = await getReference(id);

  let candidates: { m: Market; d: number | null }[];
  if (q.lat !== undefined && q.lon !== undefined) {
    const box = boundingBox(q.lat, q.lon, q.radius);
    const markets = await prisma.market.findMany({
      where: {
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLon, lte: box.maxLon },
      },
    });
    candidates = markets
      .map((m) => ({
        m,
        d: haversineKm(q.lat!, q.lon!, m.latitude, m.longitude),
      }))
      .filter((x) => x.d <= q.radius);
  } else {
    candidates = (await prisma.market.findMany()).map((m) => ({ m, d: null }));
  }

  const eff = await getEffectivePrices(
    candidates.map((c) => c.m.id),
    id
  );

  const items = candidates
    .flatMap(({ m, d }) => {
      const e = eff.get(m.id)?.get(id);
      if (!e) return []; // no price data -> not listed
      return [
        {
          market: {
            id: m.id,
            name: m.name,
            type: m.type,
            distanceKm: d === null ? null : round1(d),
          },
          price: e.price,
          source: e.source,
          sourceLabel: SOURCE_LABEL[e.source],
          date: e.date,
        },
      ];
    })
    .sort(
      (a, b) =>
        a.price - b.price ||
        (a.market.distanceKm ?? Infinity) - (b.market.distanceKm ?? Infinity)
    )
    .slice(0, q.limit);

  return {
    reference: reference
      ? {
          price: reference.price,
          source: reference.source,
          sourceLabel: reference.sourceLabel,
          date: reference.date,
        }
      : null,
    items,
  };
}
