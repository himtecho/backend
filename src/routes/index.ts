import { Router } from "express";
import { reportLimiter } from "../middlewares/rateLimit";
import { ok } from "../utils/response";
import * as price from "../controllers/price.controller";
import * as commodity from "../controllers/commodity.controller";
import * as market from "../controllers/market.controller";
import * as event from "../controllers/event.controller";
import * as report from "../controllers/report.controller";

const router = Router();

router.get("/health", (_req, res) => ok(res, { status: "ok" }));

router.get("/prices/summary", price.summary);

router.get("/commodities", commodity.list);
router.get("/commodities/:id", commodity.getOne);
router.get("/commodities/:id/history", commodity.history);
router.get("/commodities/:id/markets", commodity.markets);

router.get("/markets/nearby", market.nearby); // must stay above /markets/:id
router.get("/markets/:id", market.getOne);

router.get("/events", event.list);
router.get("/events/:id", event.getOne);

router.post("/reports", reportLimiter, report.create);

export default router;
