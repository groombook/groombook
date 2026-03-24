ALTER TABLE appointments ADD COLUMN customer_notes TEXT;

CREATE INDEX idx_appointments_customer_notes ON appointments (client_id) WHERE customer_notes IS NOT NULL;
