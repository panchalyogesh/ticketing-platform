import { and, count, eq, gte, sql } from "drizzle-orm";

import { db, schema } from "@repo/database";

import { env } from "../lib/env";
import { calculatePriceBreakdown } from "../pricing";

export class SoldOutError extends Error {
  constructor(message = "Not enough tickets available") {
    super(message);
    this.name = "SoldOutError";
  }
}

export async function createBooking(input: {
  eventId: string;
  userEmail: string;
  quantity: number;
}) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT id
      FROM events
      WHERE id = ${input.eventId}::uuid
      FOR UPDATE
    `);

    const [event] = await tx
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, input.eventId));

    if (!event) {
      throw new Error("Event not found");
    }

    const remaining = event.totalTickets - event.bookedTickets;
    if (remaining < input.quantity) {
      throw new SoldOutError();
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [recent] = await tx
      .select({ value: count() })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.eventId, input.eventId),
          gte(schema.bookings.createdAt, oneHourAgo),
        ),
      );

    const breakdown = calculatePriceBreakdown({
      event,
      bookingsInLastHour: recent?.value ?? 0,
      weights: env.pricingWeights,
    });

    const [booking] = await tx
      .insert(schema.bookings)
      .values({
        eventId: input.eventId,
        userEmail: input.userEmail,
        quantity: input.quantity,
        pricePaid: breakdown.finalPrice.toFixed(2),
      })
      .returning();

    await tx
      .update(schema.events)
      .set({
        bookedTickets: event.bookedTickets + input.quantity,
        currentPrice: breakdown.finalPrice.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(schema.events.id, input.eventId));

    const unitPrice = breakdown.finalPrice;
    const totalPaid = Number((unitPrice * input.quantity).toFixed(2));

    return { booking, unitPrice, totalPaid };
  });
}
