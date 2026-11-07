import { Request, Response } from "express";
import { z } from "zod";
import { MarketType } from "../../generated/prisma/client";
import { ok } from "../utils/response";
import {
  MARKET_TYPES,
  idParam,
  latQuery,
  limitQuery,
  lonQuery,
} from "../utils/validation";
import * as service from "../services/market.service";

const nearbyQuery = z.object({
  lat: latQuery,
  lon: lonQuery,
  radius: z.coerce.number().positive().max(50).default(5),
  type: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map((t) => t.trim()) : []))
    .pipe(z.array(z.enum(MARKET_TYPES))),
  limit: limitQuery(),
});

export async function nearby(req: Request, res: Response) {
  const q = nearbyQuery.parse(req.query);
  const { data, meta } = await service.nearbyMarkets({
    lat: q.lat,
    lon: q.lon,
    radius: q.radius,
    types: q.type as MarketType[],
    limit: q.limit,
  });
  ok(res, data, meta);
}

export async function getOne(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  ok(res, await service.getMarket(id));
}
