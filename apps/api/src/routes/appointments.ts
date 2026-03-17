import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, eq, getDb, gte, lt, lte, ne, appointments } from "@groombook/db";

export const appointmentsRouter = new Hono();

const createAppointmentSchema = z.object({
  clientId: z.string().uuid(),
  petId: z.string().uuid(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().max(2000).optional(),
  priceCents: z.number().int().positive().optional(),
});

const updateAppointmentSchema = z.object({
  staffId: z.string().uuid().nullable().optional(),
  status: z
    .enum([
      "scheduled",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
      "no_show",
    ])
    .optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().max(2000).nullable().optional(),
  priceCents: z.number().int().positive().nullable().optional(),
});

// List appointments, optionally filtered by date range or staffId
appointmentsRouter.get("/", async (c) => {
  const db = getDb();
  const from = c.req.query("from");
  const to = c.req.query("to");
  const staffId = c.req.query("staffId");

  const conditions = [];
  if (from) conditions.push(gte(appointments.startTime, new Date(from)));
  if (to) conditions.push(lte(appointments.startTime, new Date(to)));
  if (staffId) conditions.push(eq(appointments.staffId, staffId));

  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(appointments)
          .where(and(...conditions))
          .orderBy(appointments.startTime)
      : await db
          .select()
          .from(appointments)
          .orderBy(appointments.startTime);

  return c.json(rows);
});

appointmentsRouter.get("/:id", async (c) => {
  const db = getDb();
  const [row] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, c.req.param("id")));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

appointmentsRouter.post(
  "/",
  zValidator("json", createAppointmentSchema),
  async (c) => {
    const db = getDb();
    const body = c.req.valid("json");
    const start = new Date(body.startTime);
    const end = new Date(body.endTime);

    if (end <= start) {
      return c.json({ error: "endTime must be after startTime" }, 422);
    }

    // Wrap conflict check + insert in a transaction to prevent double-booking
    // race conditions under concurrent load (fixes #18).
    let row;
    try {
      row = await db.transaction(async (tx) => {
        if (body.staffId) {
          const conflicts = await tx
            .select({ id: appointments.id })
            .from(appointments)
            .where(
              and(
                eq(appointments.staffId, body.staffId),
                lt(appointments.startTime, end),
                gte(appointments.endTime, start),
                ne(appointments.status, "cancelled"),
                ne(appointments.status, "no_show"),
              )
            )
            .limit(1);
          if (conflicts.length > 0) {
            throw Object.assign(new Error("conflict"), { statusCode: 409 });
          }
        }

        const [inserted] = await tx
          .insert(appointments)
          .values({ ...body, startTime: start, endTime: end })
          .returning();
        return inserted;
      });
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err as Error & { statusCode?: number }).statusCode === 409
      ) {
        return c.json(
          { error: "Staff member has a conflicting appointment at this time" },
          409
        );
      }
      throw err;
    }

    return c.json(row, 201);
  }
);

appointmentsRouter.patch(
  "/:id",
  zValidator("json", updateAppointmentSchema),
  async (c) => {
    const db = getDb();
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const needsConflictCheck =
      body.startTime !== undefined ||
      body.endTime !== undefined ||
      body.staffId !== undefined;

    const update: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.startTime) update.startTime = new Date(body.startTime);
    if (body.endTime) update.endTime = new Date(body.endTime);

    if (needsConflictCheck) {
      // Wrap conflict check + update in a transaction to prevent race conditions
      // (fixes #18). Also falls back to the existing staffId when staffId is
      // omitted from the request, so rescheduling always checks conflicts (fixes #19).
      let row;
      try {
        row = await db.transaction(async (tx) => {
          const [current] = await tx
            .select()
            .from(appointments)
            .where(eq(appointments.id, id))
            .limit(1);
          if (!current) {
            throw Object.assign(new Error("not found"), { statusCode: 404 });
          }

          const start = body.startTime
            ? new Date(body.startTime)
            : current.startTime;
          const end = body.endTime ? new Date(body.endTime) : current.endTime;
          // Use provided staffId (may be null to unassign); fall back to existing
          const staffId =
            body.staffId !== undefined ? body.staffId : current.staffId;

          if (end <= start) {
            throw Object.assign(new Error("end before start"), {
              statusCode: 422,
            });
          }

          if (staffId) {
            const conflicts = await tx
              .select({ id: appointments.id })
              .from(appointments)
              .where(
                and(
                  eq(appointments.staffId, staffId),
                  lt(appointments.startTime, end),
                  gte(appointments.endTime, start),
                  ne(appointments.status, "cancelled"),
                  ne(appointments.status, "no_show"),
                  ne(appointments.id, id),
                )
              )
              .limit(1);
            if (conflicts.length > 0) {
              throw Object.assign(new Error("conflict"), { statusCode: 409 });
            }
          }

          const [updated] = await tx
            .update(appointments)
            .set(update)
            .where(eq(appointments.id, id))
            .returning();
          return updated;
        });
      } catch (err: unknown) {
        const statusCode = (err as Error & { statusCode?: number }).statusCode;
        if (statusCode === 404) return c.json({ error: "Not found" }, 404);
        if (statusCode === 422)
          return c.json({ error: "endTime must be after startTime" }, 422);
        if (statusCode === 409)
          return c.json(
            {
              error:
                "Staff member has a conflicting appointment at this time",
            },
            409
          );
        throw err;
      }

      if (!row) return c.json({ error: "Not found" }, 404);
      return c.json(row);
    }

    const [row] = await db
      .update(appointments)
      .set(update)
      .where(eq(appointments.id, id))
      .returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  }
);

// Soft-delete: cancel the appointment instead of removing the row,
// preserving audit trail and financial records (fixes #20).
appointmentsRouter.delete("/:id", async (c) => {
  const db = getDb();
  const [row] = await db
    .update(appointments)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(appointments.id, c.req.param("id")))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});
