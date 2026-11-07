import { prisma } from "../config/prisma";
import { jakartaDateStr, toDbDate, toJakartaIso } from "../utils/date";
import { ApiError } from "../utils/response";
import { getReference } from "./price.service";

export async function createReport(input: {
  marketId: number;
  commodityId: number;
  price: number;
}) {
  const [market, commodity] = await Promise.all([
    prisma.market.findUnique({ where: { id: input.marketId } }),
    prisma.commodity.findUnique({ where: { id: input.commodityId } }),
  ]);
  if (!market) throw new ApiError(404, "NOT_FOUND", "Pasar tidak ditemukan");
  if (!commodity)
    throw new ApiError(404, "NOT_FOUND", "Komoditas tidak ditemukan");

  const ref = await getReference(input.commodityId);
  if (ref) {
    const min = Math.ceil(ref.price * 0.5);
    const max = Math.floor(ref.price * 2);
    if (input.price < min || input.price > max) {
      throw new ApiError(
        422,
        "PRICE_OUT_OF_RANGE",
        `Harga harus antara ${min} dan ${max} (50%-200% dari harga acuan kota)`,
        { min, max, reference: ref.price }
      );
    }
  }

  const row = await prisma.price.create({
    data: {
      marketId: input.marketId,
      commodityId: input.commodityId,
      price: input.price,
      source: "CITIZEN",
      date: toDbDate(jakartaDateStr()),
    },
  });

  return {
    id: row.id,
    marketId: row.marketId,
    commodityId: row.commodityId,
    price: row.price,
    source: row.source,
    createdAt: toJakartaIso(row.createdAt),
  };
}
