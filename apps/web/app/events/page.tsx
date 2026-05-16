import Link from "next/link";

import { getEvents } from "../../lib/api";

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-white">Upcoming Events</h1>
          <p className="mt-1 text-slate-300">Live pricing updates based on time, demand, and inventory.</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group rounded-xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-0.5 hover:border-sky-400/50 hover:bg-white/10"
          >
            <h2 className="text-2xl font-medium text-white">{event.name}</h2>
            <p className="mt-2 text-sm text-slate-300">{new Date(event.date).toLocaleString()}</p>
            <p className="text-sm text-slate-300">{event.venue}</p>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-950/40 p-3 text-sm">
              <div>
                <p className="text-slate-400">Current Price</p>
                <p className="font-semibold text-sky-300">Rs. {Number(event.currentPrice).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-400">Remaining</p>
                <p className="font-semibold text-emerald-300">{event.ticketsRemaining}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
