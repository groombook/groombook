CREATE TABLE IF NOT EXISTS "business_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_name" text DEFAULT 'GroomBook' NOT NULL,
  "logo_base64" text,
  "logo_mime_type" text,
  "primary_color" text DEFAULT '#4f8a6f' NOT NULL,
  "accent_color" text DEFAULT '#8b7355' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Seed a default row so GET always returns something
INSERT INTO "business_settings" ("business_name", "primary_color", "accent_color")
VALUES ('GroomBook', '#4f8a6f', '#8b7355')
ON CONFLICT DO NOTHING;
