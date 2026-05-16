import { db } from "./index";
import { events } from "./schema";

const now = new Date();

const sampleEvents = [
  {
    name: "AI Builders Summit",
    date: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
    venue: "Bengaluru Convention Center",
    description: "Conference for AI developers and founders.",
    totalTickets: 400,
    bookedTickets: 60,
    basePrice: "1200.00",
    currentPrice: "1200.00",
    floorPrice: "800.00",
    ceilingPrice: "2200.00",
    pricingRules: {
      timeThresholdDays: 7,
      highDemandBookingsPerHour: 10,
      lowInventoryThreshold: 0.2,
    },
  },
  {
    name: "Cloud Native Day",
    date: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
    venue: "Hyderabad Tech Park",
    description: "Hands-on workshops for DevOps and platform engineers.",
    totalTickets: 250,
    bookedTickets: 190,
    basePrice: "900.00",
    currentPrice: "900.00",
    floorPrice: "600.00",
    ceilingPrice: "1800.00",
    pricingRules: {
      timeThresholdDays: 7,
      highDemandBookingsPerHour: 10,
      lowInventoryThreshold: 0.2,
    },
  },
  {
    name: "Product Design Live",
    date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    venue: "Mumbai Creative Arena",
    description: "Design systems and product storytelling masterclass.",
    totalTickets: 120,
    bookedTickets: 95,
    basePrice: "1500.00",
    currentPrice: "1500.00",
    floorPrice: "1000.00",
    ceilingPrice: "3000.00",
    pricingRules: {
      timeThresholdDays: 7,
      highDemandBookingsPerHour: 10,
      lowInventoryThreshold: 0.2,
    },
  },
];

async function main() {
  await db.delete(events);
  await db.insert(events).values(sampleEvents);
  console.log(`Seeded ${sampleEvents.length} events.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to seed database", error);
  process.exit(1);
});
