import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, eq, getDb, ne, staff, appointments } from "@groombook/db";

export const staffRouter = new Hono();

const createStaffSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  role: z.enum(["groomer", "receptionist", "manager"]).default("groomer"),
  oidcSub: z.string().optional(),
  active: z.boolean().default(true),
});

const updateStaffSchema = createStaffSchema.partial().omit({ email: true });

staffRouter.get("/", async (c) => {
  const db = getDb();
  const includeInactive = c.req.query("includeInactive") === "true";
  const rows = includeInactive
    ? await db.select().from(staff).orderBy(staff.name)
    : await db.select().from(staff).where(eq(staff.active, true)).orderBy(staff.name);
  return c.json(rows);
});

staffRouter.get("/:id", async (c) => {
  const db = getDb();
  const [row] = await db
    .select()
    .from(staff)
    .where(eq(staff.id, c.req.param("id")));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

staffRouter.post("/", zValidator("json", createStaffSchema), async (c) => {
  const db = getDb();
  const body = c.req.valid("json");
  const [row] = await db.insert(staff).values(body).returning();
  return c.json(row, 201);
});

staffRouter.patch("/:id", zValidator("json", updateStaffSchema), async (c) => {
  const db = getDb();
  const body = c.req.valid("json");
  const [row] = await db
    .update(staff)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(staff.id, c.req.param("id")))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

staffRouter.delete("/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");

  // Prevent deleting staff who have existing non-cancelled appointments (fixes #21).
  const activeAppointments = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.staffId, id),
        ne(appointments.status, "cancelled"),
        ne(appointments.status, "no_show"),
      )
    )
    .limit(1);
  if (activeAppointments.length > 0) {
    return c.json(
      {
        error:
          "Cannot delete staff member with existing appointments. Reassign or cancel their appointments first.",
      },
      409
    );
  }

  const [row] = await db
    .delete(staff)
    .where(eq(staff.id, id))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});
