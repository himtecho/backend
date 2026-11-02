import { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, details: err.details },
    });
    return;
  }

  console.error(err);

  res.status(500).json({
    success: false,
    error: {
      message: "Internal server error",
      ...(env.NODE_ENV === "development" && { details: String(err) }),
    },
  });
};
