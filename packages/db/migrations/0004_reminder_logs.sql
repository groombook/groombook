-- Add email opt-out flag to clients
ALTER TABLE "clients" ADD COLUMN "email_opt_out" boolean NOT NULL DEFAULT false;

-- Track sent reminders to prevent duplicate sends
CREATE TABLE "reminder_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL REFERENCES "appointments"("id") ON DELETE CASCADE,
	"reminder_type" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	UNIQUE ("appointment_id", "reminder_type")
);
