import { z } from "zod";

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const limitQuery = (def = 20) =>
  z.coerce.number().int().min(1).max(50).default(def);

export const latQuery = z.coerce.number().min(-90).max(90);
export const lonQuery = z.coerce.number().min(-180).max(180);

export const MARKET_TYPES = [
  "TRADITIONAL",
  "CHEAP_MARKET",
  "STORE",
  "SUPERMARKET",
] as const;
