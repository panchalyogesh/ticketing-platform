import { and, count, desc, eq, gte, sql } from "drizzle-orm";

import { db, schema } from "@repo/database";

import { env } from "../lib/env";
import { calculatePriceBreakdown } from "../pricing";

export async function listEvents() {
  const events = await db.select().from(schema.events).orderBy(schema.events.date);
  return Promise.all(
    events.map(async (event) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const [recent] = await db
        .select({ value: count() })
        .from(schema.bookings)
        .where(
          and(
            eq(schema.bookings.eventId, event.id),
            gte(schema.bookings.createdAt, oneHourAgo),
          ),
        );

      const breakdown = calculatePriceBreakdown({
        event,
        bookingsInLastHour: recent?.value ?? 0,
        weights: env.pricingWeights,
      });

      return {
        ...event,
        currentPrice: breakdown.finalPrice,
        ticketsRemaining: Math.max(event.totalTickets - event.bookedTickets, 0),
      };
    }),
  );
}

export async function getEventDetails(eventId: string) {
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, eventId));
  if (!event) return null;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [recent] = await db
    .select({ value: count() })
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.eventId, event.id),
        gte(schema.bookings.createdAt, oneHourAgo),
      ),
    );

  const breakdown = calculatePriceBreakdown({
    event,
    bookingsInLastHour: recent?.value ?? 0,
    weights: env.pricingWeights,
  });

  return {
    ...event,
    currentPrice: breakdown.finalPrice,
    ticketsRemaining: Math.max(event.totalTickets - event.bookedTickets, 0),
    priceBreakdown: breakdown,
  };
}

export async function createEvent(input: {
  name: string;
  date: string;
  venue: string;
  description: string;
  totalTickets: number;
  basePrice: number;
  floorPrice: number;
  ceilingPrice: number;
  pricingRules?: Record<string, unknown>;
}) {
  const [created] = await db
    .insert(schema.events)
    .values({
      name: input.name,
      date: new Date(input.date),
      venue: input.venue,
      description: input.description,
      totalTickets: input.totalTickets,
      bookedTickets: 0,
      basePrice: input.basePrice.toFixed(2),
      currentPrice: input.basePrice.toFixed(2),
      floorPrice: input.floorPrice.toFixed(2),
      ceilingPrice: input.ceilingPrice.toFixed(2),
      pricingRules: input.pricingRules ?? {},
    })
    .returning();

  return created;
}

export async function seedEvents() {
  const now = new Date();
  const rows = [
    {
      name: "Startup GTM Conf",
      date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      venue: "Delhi Expo Hall",
      description: "Growth and GTM playbooks from top operators.",
      totalTickets: 300,
      bookedTickets: 50,
      basePrice: "1100.00",
      currentPrice: "1100.00",
      floorPrice: "700.00",
      ceilingPrice: "2200.00",
      pricingRules: {},
    },
    {
      name: "Frontend Future",
      date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      venue: "Pune Dev Arena",
      description: "React, AI UX, and performance deep dives.",
      totalTickets: 200,
      bookedTickets: 160,
      basePrice: "1400.00",
      currentPrice: "1400.00",
      floorPrice: "900.00",
      ceilingPrice: "2800.00",
      pricingRules: {},
    },
  ];

  await db.insert(schema.events).values(rows);
  return { inserted: rows.length };
}

export async function getEventBookings(eventId: string) {
  return db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.eventId, eventId))
    .orderBy(desc(schema.bookings.createdAt));
}

export async function getSummaryAnalytics() {
  const [metrics] = await db
    .select({
      totalEvents: count(schema.events.id),
      totalBookings: count(schema.bookings.id),
      totalRevenue: sql<number>`coalesce(sum(${schema.bookings.pricePaid}::numeric * ${schema.bookings.quantity}), 0)`,
    })
    .from(schema.events)
    .leftJoin(schema.bookings, eq(schema.events.id, schema.bookings.eventId));
  const safeMetrics = metrics ?? { totalEvents: 0, totalBookings: 0, totalRevenue: 0 };

  return {
    ...safeMetrics,
    totalRevenue: Number(Number(safeMetrics.totalRevenue ?? 0).toFixed(2)),
  };
}

export async function getEventAnalytics(eventId: string) {
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, eventId));
  if (!event) return null;

  const [metrics] = await db
    .select({
      bookingsCount: count(schema.bookings.id),
      revenue: sql<number>`coalesce(sum(${schema.bookings.pricePaid}::numeric * ${schema.bookings.quantity}), 0)`,
      avgPrice: sql<number>`coalesce(avg(${schema.bookings.pricePaid}::numeric), 0)`,
    })
    .from(schema.bookings)
    .where(eq(schema.bookings.eventId, eventId));
  const safeMetrics = metrics ?? { bookingsCount: 0, revenue: 0, avgPrice: 0 };

  return {
    eventId,
    totalSold: event.bookedTickets,
    remaining: Math.max(event.totalTickets - event.bookedTickets, 0),
    revenue: Number(Number(safeMetrics.revenue ?? 0).toFixed(2)),
    averagePrice: Number(Number(safeMetrics.avgPrice ?? 0).toFixed(2)),
    bookingsCount: safeMetrics.bookingsCount,
  };
}
