import { MarketType } from "../../generated/prisma/client";
import { prisma } from "../config/prisma";
import { boundingBox, haversineKm, round1 } from "../algorithms/geo";
import { isOpenNow } from "../algorithms/openHours";
import { SOURCE_LABEL } from "../utils/labels";
import { ApiError } from "../utils/response";
import { getEffectivePrices } from "./price.service";

export async function nearbyMarkets(q: {
  lat: number;
  lon: number;
  radius: number;
  types: MarketType[];
  limit: number;
}) {
  const box = boundingBox(q.lat, q.lon, q.radius);
  const markets = await prisma.market.findMany({
    where: {
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLon, lte: box.maxLon },
      ...(q.types.length ? { type: { in: q.types } } : {}),
    },
  });

  const nearest = markets
    .map((m) => ({ m, d: haversineKm(q.lat, q.lon, m.latitude, m.longitude) }))
    .filter((x) => x.d <= q.radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, q.limit);

  const [eff, commodities] = await Promise.all([
    getEffectivePrices(nearest.map((x) => x.m.id)),
    prisma.commodity.findMany(),
  ]);
  const cMap = new Map(commodities.map((c) => [c.id, c]));

  const data = nearest.map(({ m, d }) => {
    const topPrices = [...(eff.get(m.id)?.entries() ?? [])]
      .sort((a, b) => a[0] - b[0])
      .slice(0, 3)
      .flatMap(([commodityId, e]) => {
        const c = cMap.get(commodityId);
        return c
          ? [
              {
                commodityId,
                name: c.name,
                unit: c.unit,
                price: e.price,
                source: e.source,
              },
            ]
          : [];
      });
    return {
      id: m.id,
      name: m.name,
      type: m.type,
      address: m.address,
      latitude: m.latitude,
      longitude: m.longitude,
      distanceKm: round1(d),
      openHours: m.openHours,
      isOpenNow: isOpenNow(m.openHours),
      topPrices,
    };
  });

  return { data, meta: { count: data.length, radiusKm: q.radius } };
}

export async function getMarket(id: number) {
  const m = await prisma.market.findUnique({ where: { id } });
  if (!m) throw new ApiError(404, "NOT_FOUND", "Market not found");

  const [eff, commodities] = await Promise.all([
    getEffectivePrices([id]),
    prisma.commodity.findMany({ orderBy: { id: "asc" } }),
  ]);
  const prices = commodities.flatMap((c) => {
    const e = eff.get(id)?.get(c.id);
    return e
      ? [
          {
            commodityId: c.id,
            name: c.name,
            unit: c.unit,
            iconUrl: c.iconUrl,
            price: e.price,
            source: e.source,
            sourceLabel: SOURCE_LABEL[e.source],
            date: e.date,
          },
        ]
      : [];
  });

  return {
    id: m.id,
    name: m.name,
    type: m.type,
    address: m.address,
    latitude: m.latitude,
    longitude: m.longitude,
    openHours: m.openHours,
    isOpenNow: isOpenNow(m.openHours),
    prices,
  };
}
