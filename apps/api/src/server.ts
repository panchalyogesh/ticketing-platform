import "dotenv/config";

import cors from "cors";
import express from "express";
import { ZodError } from "zod";

import { env } from "./lib/env";
import { AppError } from "./lib/errors";
import { router } from "./routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use(router);

app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  void next;
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Validation failed",
      errors: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
    return;
  }
  const message = error instanceof Error ? error.message : "Unexpected server error";
  res.status(500).json({ message });
});

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
