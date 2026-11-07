import { Request, Response } from "express";
import { ok } from "../utils/response";
import { priceSummary } from "../services/commodity.service";

export async function summary(_req: Request, res: Response) {
  ok(res, await priceSummary());
}
