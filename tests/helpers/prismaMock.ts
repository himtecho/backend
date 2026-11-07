import { vi } from "vitest";

export const prisma = {
  market: { findUnique: vi.fn(), findMany: vi.fn() },
  commodity: { findUnique: vi.fn(), findMany: vi.fn() },
  price: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  marketEvent: { findMany: vi.fn(), findUnique: vi.fn() },
};
