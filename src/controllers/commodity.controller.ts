import { Request, Response } from "express";
import { z } from "zod";
import { ok } from "../utils/response";
import { idParam, latQuery, limitQuery, lonQuery } from "../utils/validation";
import * as service from "../services/commodity.service";

const marketsQuery = z
  .object({
    lat: latQuery.optional(),
    lon: lonQuery.optional(),
    radius: z.coerce.number().positive().max(50).default(5),
    limit: limitQuery(),
  })
  .refine((v) => (v.lat === undefined) === (v.lon === undefined), {
    message: "lat and lon must be provided together",
  });

export async function list(_req: Request, res: Response) {
  ok(res, await service.listCommodities());
}

export async function getOne(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  ok(res, await service.getCommodity(id));
}

export async function history(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  const { days } = z
    .object({ days: z.enum(["7", "30"]).default("30") })
    .parse(req.query);
  ok(res, await service.commodityHistory(id, Number(days) as 7 | 30));
}

export async function markets(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  const q = marketsQuery.parse(req.query);
  ok(res, await service.commodityMarkets(id, q));
}
