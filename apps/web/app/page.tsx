import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-slate-950/30">
        <p className="mb-2 text-sm uppercase tracking-widest text-sky-300">Event commerce engine</p>
        <h1 className="mb-4 text-5xl font-semibold leading-tight text-white">Dynamic ticket pricing made reliable.</h1>
        <p className="max-w-2xl text-slate-300">
          Browse events, see real-time price adjustments, and book tickets with concurrency-safe inventory handling.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/events" className="rounded-md bg-sky-500 px-5 py-3 text-sm font-medium text-white hover:bg-sky-400">
            Explore Events
          </Link>
          <Link href="/my-bookings" className="rounded-md border border-white/20 px-5 py-3 text-sm font-medium text-slate-100 hover:bg-white/10">
            View My Bookings
          </Link>
        </div>
      </section>
    </main>
  );
}
