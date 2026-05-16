import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

const shouldRun = process.env.RUN_DB_TESTS === "1";

(shouldRun ? describe : describe.skip)("Concurrent Bookings", () => {
  let db: (typeof import("@repo/database"))["db"];
  let schema: (typeof import("@repo/database"))["schema"];
  let eq: (typeof import("drizzle-orm"))["eq"];
  let createBooking: (typeof import("../src/services/bookings.service"))["createBooking"];
  let SoldOutError: (typeof import("../src/services/bookings.service"))["SoldOutError"];

  beforeAll(async () => {
    ({ db, schema } = await import("@repo/database"));
    ({ eq } = await import("drizzle-orm"));
    ({ createBooking, SoldOutError } = await import("../src/services/bookings.service"));

    await db.delete(schema.bookings);
    await db.delete(schema.events);
  });

  it("prevents overbooking of last ticket", async () => {
    const [event] = await db
      .insert(schema.events)
      .values({
        name: "Concurrency Event",
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        venue: "Test",
        description: "Test",
        totalTickets: 1,
        bookedTickets: 0,
        basePrice: "100.00",
        currentPrice: "100.00",
        floorPrice: "50.00",
        ceilingPrice: "300.00",
        pricingRules: {},
      })
      .returning();

    const [first, second] = await Promise.allSettled([
      createBooking({ eventId: event.id, userEmail: `a-${randomUUID()}@test.com`, quantity: 1 }),
      createBooking({ eventId: event.id, userEmail: `b-${randomUUID()}@test.com`, quantity: 1 }),
    ]);

    const fulfilled = [first, second].filter((r) => r.status === "fulfilled");
    const rejected = [first, second].filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(SoldOutError);

    const [freshEvent] = await db.select().from(schema.events).where(eq(schema.events.id, event.id));
    expect(freshEvent?.bookedTickets).toBe(1);
  });
});
