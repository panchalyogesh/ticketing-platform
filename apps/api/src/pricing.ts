import type { Event } from "@repo/database";

export type PricingWeights = {
  timeWeight: number;
  demandWeight: number;
  inventoryWeight: number;
};

export type PriceBreakdown = {
  basePrice: number;
  timeAdjustment: number;
  demandAdjustment: number;
  inventoryAdjustment: number;
  weightedAdjustmentSum: number;
  unclampedPrice: number;
  finalPrice: number;
};

export type RuleInput = {
  event: Event;
  bookingsInLastHour: number;
  now?: Date;
  weights: PricingWeights;
};

const toNumber = (value: string | number): number => Number(value);

export function calculatePriceBreakdown({
  event,
  bookingsInLastHour,
  now = new Date(),
  weights,
}: RuleInput): PriceBreakdown {
  const basePrice = toNumber(event.basePrice);
  const floorPrice = toNumber(event.floorPrice);
  const ceilingPrice = toNumber(event.ceilingPrice);

  const msToEvent = new Date(event.date).getTime() - now.getTime();
  const daysToEvent = msToEvent / (1000 * 60 * 60 * 24);

  const timeAdjustment = daysToEvent <= 1 ? 0.5 : daysToEvent <= 7 ? 0.2 : 0;
  const demandAdjustment = bookingsInLastHour > 10 ? 0.15 : 0;

  const remaining = Math.max(event.totalTickets - event.bookedTickets, 0);
  const remainingRatio = event.totalTickets > 0 ? remaining / event.totalTickets : 0;
  const inventoryAdjustment = remainingRatio < 0.2 ? 0.25 : 0;

  const weightedAdjustmentSum =
    timeAdjustment * weights.timeWeight +
    demandAdjustment * weights.demandWeight +
    inventoryAdjustment * weights.inventoryWeight;

  const unclampedPrice = basePrice * (1 + weightedAdjustmentSum);
  const finalPrice = Math.min(ceilingPrice, Math.max(floorPrice, unclampedPrice));

  return {
    basePrice,
    timeAdjustment,
    demandAdjustment,
    inventoryAdjustment,
    weightedAdjustmentSum,
    unclampedPrice,
    finalPrice: Number(finalPrice.toFixed(2)),
  };
}
