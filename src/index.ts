import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./config/prisma";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  const count = await prisma.commodity.count();
  res.json({ ok: true, commodities: count });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API on :${port}`));
