import { Request, Response } from "express";
import { z } from "zod";
import { ok } from "../utils/response";
import { idParam, latQuery, limitQuery, lonQuery } from "../utils/validation";
import * as service from "../services/event.service";

const listQuery = z
  .object({
    range: z.enum(["week", "month"]).default("month"),
    status: z.enum(["ONGOING", "UPCOMING", "ALL"]).optional(),
    lat: latQuery.optional(),
    lon: lonQuery.optional(),
    radius: z.coerce.number().positive().max(100).default(10),
    limit: limitQuery(),
  })
  .refine((v) => (v.lat === undefined) === (v.lon === undefined), {
    message: "lat and lon must be provided together",
  });

export async function list(req: Request, res: Response) {
  const q = listQuery.parse(req.query);
  ok(res, await service.listEvents(q));
}

export async function getOne(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  ok(res, await service.getEvent(id));
}
