import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { env } from "./lib/env";
import { AppError } from "./lib/errors";
import {
  bookingsQuerySchema,
  createBookingSchema,
  createEventSchema,
  idParamSchema,
} from "./lib/validation";
import { createBooking, SoldOutError } from "./services/bookings.service";
import {
  createEvent,
  getEventAnalytics,
  getEventBookings,
  getEventDetails,
  getSummaryAnalytics,
  listEvents,
  seedEvents,
} from "./services/events.service";

export const router: ExpressRouter = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/events", async (_req, res, next) => {
  try {
    const events = await listEvents();
    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.get("/events/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const event = await getEventDetails(id);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    res.json(event);
  } catch (error) {
    next(error);
  }
});

router.post("/events", async (req, res, next) => {
  try {
    const apiKey = req.header("x-api-key");
    if (apiKey !== env.adminApiKey) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const payload = createEventSchema.parse(req.body);
    if (payload.floorPrice > payload.ceilingPrice) {
      throw new AppError(400, "floorPrice must be less than or equal to ceilingPrice");
    }
    const created = await createEvent(payload);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.post("/bookings", async (req, res, next) => {
  try {
    const payload = createBookingSchema.parse(req.body);
    const result = await createBooking(payload);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof SoldOutError) {
      res.status(409).json({ message: error.message });
      return;
    }
    next(error);
  }
});

router.get("/bookings", async (req, res, next) => {
  try {
    const { eventId } = bookingsQuerySchema.parse(req.query);
    const bookings = await getEventBookings(eventId);
    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

router.get("/analytics/events/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const analytics = await getEventAnalytics(id);
    if (!analytics) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

router.get("/analytics/summary", async (_req, res, next) => {
  try {
    const summary = await getSummaryAnalytics();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

router.post("/seed", async (_req, res, next) => {
  try {
    const output = await seedEvents();
    res.status(201).json(output);
  } catch (error) {
    next(error);
  }
});

router.use((error: unknown, _req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      message: "Validation failed",
      errors: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }
  next(error);
});
