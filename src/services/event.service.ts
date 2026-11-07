import { Market, MarketEvent } from "../../generated/prisma/client";
import { prisma } from "../config/prisma";
import { haversineKm, round1 } from "../algorithms/geo";
import { diffDays, jakartaDateStr, toJakartaIso } from "../utils/date";
import { ApiError } from "../utils/response";

type EventStatus = "ONGOING" | "UPCOMING" | "ENDED";
type EventRow = MarketEvent & { market: Market };

function toDto(e: EventRow, now: Date, origin?: { lat: number; lon: number }) {
  const status: EventStatus =
    now < e.startAt ? "UPCOMING" : now <= e.endAt ? "ONGOING" : "ENDED";
  const daysUntil =
    status === "ENDED"
      ? null
      : Math.max(0, diffDays(jakartaDateStr(now), jakartaDateStr(e.startAt)));
  return {
    id: e.id,
    title: e.title,
    organizer: e.organizer,
    description: e.description,
    startAt: toJakartaIso(e.startAt),
    endAt: toJakartaIso(e.endAt),
    status,
    daysUntil,
    distanceKm: origin
      ? round1(
          haversineKm(
            origin.lat,
            origin.lon,
            e.market.latitude,
            e.market.longitude
          )
        )
      : null,
    market: {
      id: e.market.id,
      name: e.market.name,
      address: e.market.address,
      latitude: e.market.latitude,
      longitude: e.market.longitude,
    },
  };
}

export async function listEvents(q: {
  range: "week" | "month";
  status?: "ONGOING" | "UPCOMING" | "ALL";
  lat?: number;
  lon?: number;
  radius: number;
  limit: number;
}) {
  const now = new Date();
  const windowEnd = new Date(
    now.getTime() + (q.range === "week" ? 7 : 30) * 86_400_000
  );
  const wantsAll = q.status === "ALL";

  const rows = await prisma.marketEvent.findMany({
    where: {
      startAt: { lte: windowEnd },
      ...(wantsAll ? {} : { endAt: { gte: now } }),
    },
    include: { market: true },
    orderBy: { startAt: "asc" },
  });

  const origin =
    q.lat !== undefined && q.lon !== undefined
      ? { lat: q.lat, lon: q.lon }
      : undefined;
  return rows
    .map((e) => toDto(e, now, origin))
    .filter((e) =>
      q.status === "ONGOING" || q.status === "UPCOMING"
        ? e.status === q.status
        : true
    )
    .filter((e) =>
      origin && e.distanceKm !== null ? e.distanceKm <= q.radius : true
    )
    .slice(0, q.limit);
}

export async function getEvent(id: number) {
  const e = await prisma.marketEvent.findUnique({
    where: { id },
    include: { market: true },
  });
  if (!e) throw new ApiError(404, "NOT_FOUND", "Event not found");
  return toDto(e, new Date());
}
