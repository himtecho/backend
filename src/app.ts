import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();
app.set("trust proxy", 1); // correct client IP behind Render/Railway (rate limit)
app.use(helmet());

const origins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: origins }));

app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) =>
  res.json({
    success: true,
    data: { status: "ok", message: "HargaPangan API is running" },
  })
);
app.use("/api/v1", routes);

app.use((_req, res) =>
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found", details: [] },
  })
);
app.use(errorHandler);

export default app;
