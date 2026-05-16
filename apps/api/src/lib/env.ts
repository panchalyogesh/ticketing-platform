const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: parseNumber(process.env.PORT, 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  adminApiKey: process.env.ADMIN_API_KEY ?? "dev-admin-key",
  pricingWeights: {
    timeWeight: parseNumber(process.env.PRICE_TIME_WEIGHT, 1),
    demandWeight: parseNumber(process.env.PRICE_DEMAND_WEIGHT, 1),
    inventoryWeight: parseNumber(process.env.PRICE_INVENTORY_WEIGHT, 1),
  },
};
