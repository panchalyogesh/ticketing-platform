import {
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    venue: text("venue").notNull(),
    description: text("description").notNull(),
    totalTickets: integer("total_tickets").notNull(),
    bookedTickets: integer("booked_tickets").notNull().default(0),
    basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
    currentPrice: numeric("current_price", { precision: 10, scale: 2 }).notNull(),
    floorPrice: numeric("floor_price", { precision: 10, scale: 2 }).notNull(),
    ceilingPrice: numeric("ceiling_price", { precision: 10, scale: 2 }).notNull(),
    pricingRules: jsonb("pricing_rules").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventDateIdx: index("events_date_idx").on(table.date),
  }),
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    quantity: integer("quantity").notNull(),
    pricePaid: numeric("price_paid", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    bookingEventIdx: index("bookings_event_id_idx").on(table.eventId),
    bookingCreatedAtIdx: index("bookings_created_at_idx").on(table.createdAt),
  }),
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
