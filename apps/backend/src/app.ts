import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { loadEnvironment } from "./config/environment.js";
import { sendSuccess } from "./utils/apiResponse.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import {
  materialCategoriesRouter,
  materialsRouter,
  unitsRouter,
  workCategoriesRouter,
  workItemsRouter,
} from "./modules/catalog/catalog.routes.js";
import { ahspRouter } from "./modules/ahsp/ahsp.routes.js";
import { filesRouter } from "./modules/files/files.routes.js";
import { projectsRouter } from "./modules/projects/projects.routes.js";
import { rabRouter } from "./modules/rab/rab.routes.js";
import { monitoringRouter, realizationsRouter } from "./modules/monitoring/monitoring.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { settingsRouter } from "./modules/settings/settings.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

export function createApp(): Express {
  const env = loadEnvironment();
  const app = express();

  app.set("trust proxy", 1);

  const allowedOrigins = new Set(
    env.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  if (process.env.VERCEL_URL) {
    allowedOrigins.add(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    allowedOrigins.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }

  app.use(helmet());
  app.use(
    cors((req, callback) => {
      const origin = req.header("origin");
      const host = req.header("x-forwarded-host") ?? req.header("host");
      const isSameHost = Boolean(
        origin && host && (origin === `https://${host}` || origin === `http://${host}`),
      );

      if (!origin || allowedOrigins.has(origin) || isSameHost) {
        callback(null, { origin: true, credentials: true });
        return;
      }

      callback(null, { origin: false, credentials: true });
    }),
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/v1/health", (_req, res) => {
    sendSuccess(res, {
      status: "ok",
      service: "rab-management-backend",
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/units", unitsRouter);
  app.use("/api/v1/material-categories", materialCategoriesRouter);
  app.use("/api/v1/materials", materialsRouter);
  app.use("/api/v1/work-categories", workCategoriesRouter);
  app.use("/api/v1/work-items", workItemsRouter);
  app.use("/api/v1/ahsp", ahspRouter);
  app.use("/api/v1/files", filesRouter);
  app.use("/api/v1/projects", projectsRouter);
  app.use("/api/v1/rab", rabRouter);
  app.use("/api/v1/realizations", realizationsRouter);
  app.use("/api/v1/monitoring", monitoringRouter);
  app.use("/api/v1/reports", reportsRouter);
  app.use("/api/v1/settings", settingsRouter);
  app.use("/api/v1/users", usersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
