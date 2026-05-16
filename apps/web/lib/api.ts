const apiBase = process.env.API_BASE_URL ?? "http://localhost:3001";

export type EventDto = {
  id: string;
  name: string;
  date: string;
  venue: string;
  description: string;
  totalTickets: number;
  bookedTickets: number;
  currentPrice: number;
  ticketsRemaining: number;
};

export async function getEvents(): Promise<EventDto[]> {
  const res = await fetch(`${apiBase}/events`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function getEvent(id: string) {
  const res = await fetch(`${apiBase}/events/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch event");
  return res.json();
}

export async function getBookings(eventId: string) {
  const res = await fetch(`${apiBase}/bookings?eventId=${eventId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch bookings");
  return res.json();
}
