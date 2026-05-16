import { submitBooking } from "../../actions/book";
import { getEvent } from "../../../lib/api";

export const revalidate = 30;

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = await getEvent(id);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 lg:col-span-2">
          <h1 className="text-4xl font-semibold text-white">{event.name}</h1>
          <p className="text-slate-300">{new Date(event.date).toLocaleString()} - {event.venue}</p>
          <p className="text-slate-200">{event.description}</p>

          <div className="rounded-lg bg-slate-950/40 p-4">
            <h2 className="mb-3 text-lg font-semibold text-white">Price Breakdown</h2>
            <div className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
              <p>Base Price: <span className="font-semibold text-white">Rs. {Number(event.priceBreakdown.basePrice).toFixed(2)}</span></p>
              <p>Current Price: <span className="font-semibold text-sky-300">Rs. {Number(event.currentPrice).toFixed(2)}</span></p>
              <p>Time Adjustment: {(event.priceBreakdown.timeAdjustment * 100).toFixed(0)}%</p>
              <p>Demand Adjustment: {(event.priceBreakdown.demandAdjustment * 100).toFixed(0)}%</p>
              <p>Inventory Adjustment: {(event.priceBreakdown.inventoryAdjustment * 100).toFixed(0)}%</p>
              <p>Tickets Remaining: <span className="font-semibold text-emerald-300">{event.ticketsRemaining}</span></p>
            </div>
          </div>
        </div>

        <form action={submitBooking} className="h-fit space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
          <input type="hidden" name="eventId" value={event.id} />
          <h2 className="text-xl font-semibold text-white">Book Tickets</h2>
          <p className="text-sm text-slate-300">Unit price: Rs. {Number(event.currentPrice).toFixed(2)}</p>

          <div>
            <label className="mb-1 block text-sm text-slate-200" htmlFor="userEmail">Email</label>
            <input id="userEmail" name="userEmail" type="email" required className="w-full rounded-md border border-white/20 bg-slate-950/40 px-3 py-2 text-white outline-none ring-sky-400 focus:ring-2" />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-200" htmlFor="quantity">Quantity</label>
            <input id="quantity" name="quantity" type="number" min={1} max={10} defaultValue={1} required className="w-full rounded-md border border-white/20 bg-slate-950/40 px-3 py-2 text-white outline-none ring-sky-400 focus:ring-2" />
          </div>

          <button type="submit" className="w-full rounded-md bg-sky-500 px-4 py-2.5 font-medium text-white hover:bg-sky-400">
            Confirm Booking
          </button>
        </form>
      </section>
    </main>
  );
}
