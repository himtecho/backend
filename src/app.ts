import express, { Request, Response } from "express";
import { errorHandler, notFound } from "./middlewares/errorHandler";

const app = express();

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({ success: true, data: { message: "himtech API is running" } });
});

// Must be registered after all routes
app.use(notFound);
app.use(errorHandler);

export default app;
