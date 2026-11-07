import { Request, Response } from "express";
import { z } from "zod";
import { ok } from "../utils/response";
import { createReport } from "../services/report.service";

const reportBody = z.object({
  marketId: z.number().int().positive(),
  commodityId: z.number().int().positive(),
  price: z.number().int("price must be an integer").min(100).max(10_000_000),
});

export async function create(req: Request, res: Response) {
  const body = reportBody.parse(req.body);
  ok(res, await createReport(body), undefined, 201);
}
