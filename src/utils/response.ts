import { Response } from "express";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export const ok = (
  res: Response,
  data: unknown,
  meta?: unknown,
  status = 200
) =>
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
