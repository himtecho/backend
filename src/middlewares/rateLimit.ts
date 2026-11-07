import rateLimit from "express-rate-limit";

export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Terlalu banyak laporan, coba lagi nanti",
        details: [],
      },
    }),
});
