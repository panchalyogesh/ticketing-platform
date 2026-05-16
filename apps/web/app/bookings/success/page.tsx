import Link from "next/link";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function BookingSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const quantity = Number(params.quantity ?? 0);
  const unitPrice = Number(params.unitPrice ?? 0);
  const totalPaid = Number(params.totalPaid ?? unitPrice * quantity);

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <section className="space-y-5 rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-8">
        <h1 className="text-3xl font-semibold text-emerald-300">Booking Confirmed</h1>
        <div className="grid gap-2 text-sm text-slate-100">
          <p>Booking ID: {params.bookingId}</p>
          <p>Event ID: {params.eventId}</p>
          <p>Email: {params.email}</p>
          <p>Tickets: {quantity}</p>
          <p>Unit Price: Rs. {unitPrice.toFixed(2)}</p>
          <p className="text-base font-semibold">Total Paid: Rs. {totalPaid.toFixed(2)}</p>
        </div>
        <div className="flex gap-4">
          <Link className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900" href={`/my-bookings?email=${encodeURIComponent(params.email ?? "")}`}>
            View My Bookings
          </Link>
          <Link className="rounded-md border border-white/30 px-4 py-2 text-sm font-medium text-white" href="/events">
            Browse More Events
          </Link>
        </div>
      </section>
    </main>
  );
}
