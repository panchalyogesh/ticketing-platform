import { describe, expect, it } from "vitest";

import { calculatePriceBreakdown } from "../src/pricing";

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  id: "e1",
  name: "Event",
  date: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
  venue: "Venue",
  description: "Desc",
  totalTickets: 100,
  bookedTickets: 10,
  basePrice: "100.00",
  currentPrice: "100.00",
  floorPrice: "80.00",
  ceilingPrice: "200.00",
  pricingRules: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("pricing", () => {
  it("applies time rule", () => {
    const event = makeEvent({ date: new Date(Date.now() + 12 * 60 * 60 * 1000) });
    const result = calculatePriceBreakdown({
      event,
      bookingsInLastHour: 0,
      weights: { timeWeight: 1, demandWeight: 0, inventoryWeight: 0 },
    });
    expect(result.finalPrice).toBe(150);
  });

  it("applies demand rule", () => {
    const event = makeEvent();
    const result = calculatePriceBreakdown({
      event,
      bookingsInLastHour: 12,
      weights: { timeWeight: 0, demandWeight: 1, inventoryWeight: 0 },
    });
    expect(result.finalPrice).toBe(115);
  });

  it("applies inventory rule", () => {
    const event = makeEvent({ bookedTickets: 90 });
    const result = calculatePriceBreakdown({
      event,
      bookingsInLastHour: 0,
      weights: { timeWeight: 0, demandWeight: 0, inventoryWeight: 1 },
    });
    expect(result.finalPrice).toBe(125);
  });

  it("combines all rules", () => {
    const event = makeEvent({ bookedTickets: 90, date: new Date(Date.now() + 12 * 60 * 60 * 1000) });
    const result = calculatePriceBreakdown({
      event,
      bookingsInLastHour: 20,
      weights: { timeWeight: 1, demandWeight: 1, inventoryWeight: 1 },
    });
    expect(result.finalPrice).toBe(190);
  });

  it("respects floor and ceiling", () => {
    const high = makeEvent({ ceilingPrice: "130.00", bookedTickets: 95, date: new Date(Date.now() + 12 * 60 * 60 * 1000) });
    const highResult = calculatePriceBreakdown({
      event: high,
      bookingsInLastHour: 20,
      weights: { timeWeight: 1, demandWeight: 1, inventoryWeight: 1 },
    });
    expect(highResult.finalPrice).toBe(130);

    const low = makeEvent({
      floorPrice: "95.00",
      date: new Date(Date.now() + 12 * 60 * 60 * 1000),
    });
    const lowResult = calculatePriceBreakdown({
      event: low,
      bookingsInLastHour: 0,
      weights: { timeWeight: -0.5, demandWeight: 0, inventoryWeight: 0 },
    });
    expect(lowResult.finalPrice).toBe(95);
  });
});
