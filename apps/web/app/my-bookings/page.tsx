import { getEvents } from "../../lib/api";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

type BookingRow = {
  bookingId: string;
  eventName: string;
  quantity: number;
  unitPricePaid: number;
  totalPaid: number;
  currentUnitPrice: number;
};

export default async function MyBookingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const email = params.email ?? "";

  const events = await getEvents();
  const enriched = await Promise.all(
    events.map(async (event) => {
      const res = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:3001"}/bookings?eventId=${event.id}`, {
        cache: "no-store",
      });
      const bookings = res.ok ? await res.json() : [];
      return bookings
        .filter((booking: { userEmail: string }) => booking.userEmail === email)
        .map((booking: { id: string; quantity: number; pricePaid: string }) => {
          const unitPricePaid = Number(booking.pricePaid);
          const totalPaid = Number((unitPricePaid * booking.quantity).toFixed(2));
          return {
            bookingId: booking.id,
            eventName: event.name,
            quantity: booking.quantity,
            unitPricePaid,
            totalPaid,
            currentUnitPrice: Number(event.currentPrice),
          } as BookingRow;
        });
    }),
  );

  const rows = enriched.flat();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-1 text-3xl font-semibold text-white">My Bookings</h1>
      <p className="mb-6 text-sm text-slate-300">Email: {email || "(provide via ?email=your@email.com)"}</p>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-slate-300">No bookings found.</p>
        ) : (
          rows.map((row) => (
            <div key={row.bookingId} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-lg font-semibold text-white">{row.eventName}</p>
              <div className="mt-2 grid gap-1 text-sm text-slate-300 md:grid-cols-2">
                <p>Tickets: {row.quantity}</p>
                <p>Unit Price Paid: Rs. {row.unitPricePaid.toFixed(2)}</p>
                <p className="font-semibold text-emerald-300">Total Paid: Rs. {row.totalPaid.toFixed(2)}</p>
                <p>Current Unit Price: Rs. {row.currentUnitPrice.toFixed(2)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
