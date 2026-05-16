"use server";

import { redirect } from "next/navigation";

const apiBase = process.env.API_BASE_URL ?? "http://localhost:3001";

export async function submitBooking(formData: FormData) {
  const eventId = String(formData.get("eventId") || "");
  const userEmail = String(formData.get("userEmail") || "");
  const quantity = Number(formData.get("quantity") || "1");

  if (!eventId || !userEmail || quantity <= 0) {
    throw new Error("Invalid booking request");
  }

  const res = await fetch(`${apiBase}/bookings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventId, userEmail, quantity }),
    cache: "no-store",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Booking failed" }));
    throw new Error(error.message || "Booking failed");
  }

  const payload = await res.json();
  redirect(
    `/bookings/success?bookingId=${payload.booking.id}&eventId=${payload.booking.eventId}&email=${encodeURIComponent(payload.booking.userEmail)}&quantity=${payload.booking.quantity}&unitPrice=${payload.unitPrice}&totalPaid=${payload.totalPaid}`,
  );
}
