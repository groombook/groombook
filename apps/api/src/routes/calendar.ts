import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import {
  and,
  eq,
  gte,
  getDb,
  appointments,
  clients,
  pets,
  services,
  staff,
} from "@groombook/db";

export const calendarRouter = new Hono();

function formatIcalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcalText(text: string | null): string {
  if (!text) return "";
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildIcalFeed(
  appointments: Array<{
    id: string;
    startTime: Date;
    endTime: Date;
    status: string;
    clientName: string | null;
    petName: string | null;
    serviceName: string | null;
  }>,
  staffName: string
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GroomBook//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcalText(staffName)} - GroomBook`,
  ];

  for (const appt of appointments) {
    const status = appt.status === "cancelled" ? "CANCELLED" : "CONFIRMED";
    const summary = `${appt.petName ?? "Pet"} - ${appt.serviceName ?? "Appointment"}`;
    const description = `Client: ${appt.clientName ?? "Unknown"}\nPet: ${appt.petName ?? "Unknown"}\nService: ${appt.serviceName ?? "Unknown"}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${appt.id}@groombook`,
      `DTSTAMP:${formatIcalDate(new Date())}`,
      `DTSTART:${formatIcalDate(new Date(appt.startTime))}`,
      `DTEND:${formatIcalDate(new Date(appt.endTime))}`,
      `SUMMARY:${escapeIcalText(summary)}`,
      `DESCRIPTION:${escapeIcalText(description)}`,
      `STATUS:${status}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

calendarRouter.get("/:staffId.ics", async (c) => {
  const db = getDb();
  const staffId = c.req.param("staffId") as string;
  const token = c.req.query("token") as string;

  if (!token) {
    return c.json({ error: "Missing token parameter" }, 401);
  }

  const [staffMember] = await db
    .select()
    .from(staff)
    .where(eq(staff.id, staffId))
    .limit(1);

  if (!staffMember || staffMember.icalToken !== token) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const now = new Date();
  const rows = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.staffId, staffId),
        gte(appointments.startTime, now)
      )
    )
    .orderBy(appointments.startTime);

  const enriched = await Promise.all(
    rows.map(async (appt) => {
      const [client] = await db
        .select({ name: clients.name })
        .from(clients)
        .where(eq(clients.id, appt.clientId))
        .limit(1);
      const [pet] = await db
        .select({ name: pets.name })
        .from(pets)
        .where(eq(pets.id, appt.petId))
        .limit(1);
      const [service] = await db
        .select({ name: services.name })
        .from(services)
        .where(eq(services.id, appt.serviceId))
        .limit(1);
      return {
        ...appt,
        clientName: client?.name ?? null,
        petName: pet?.name ?? null,
        serviceName: service?.name ?? null,
      };
    })
  );

  const ical = buildIcalFeed(enriched, staffMember.name);
  return c.text(ical, 200, {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `attachment; filename="${staffMember.name.replace(/\s+/g, "_")}_calendar.ics"`,
  });
});

export function generateIcalToken(): string {
  return randomBytes(32).toString("hex");
}
