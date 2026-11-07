import { PriceSource } from "../../generated/prisma/client";

export const SOURCE_LABEL: Record<PriceSource, string> = {
  PIHPS: "Harga acuan kota (PIHPS BI)",
  SEED: "Estimasi",
  CITIZEN: "Laporan warga",
};
