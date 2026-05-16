import { z } from "zod";

export const createEventSchema = z.object({
  name: z.string().min(1),
  date: z.string().datetime(),
  venue: z.string().min(1),
  description: z.string().min(1),
  totalTickets: z.number().int().positive(),
  basePrice: z.number().positive(),
  floorPrice: z.number().positive(),
  ceilingPrice: z.number().positive(),
  pricingRules: z.record(z.unknown()).optional(),
});

export const createBookingSchema = z.object({
  eventId: z.string().uuid(),
  userEmail: z.string().email(),
  quantity: z.number().int().positive().max(10),
});

export const bookingsQuerySchema = z.object({
  eventId: z.string().uuid(),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
