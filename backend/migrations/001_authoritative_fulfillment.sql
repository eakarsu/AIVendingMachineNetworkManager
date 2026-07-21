BEGIN;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE TABLE IF NOT EXISTS fulfillment_orders (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id TEXT NOT NULL, location_id TEXT NOT NULL, subject_id TEXT NOT NULL,
 idempotency_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', version INTEGER NOT NULL DEFAULT 1, paid_cents BIGINT NOT NULL DEFAULT 0,
 currency CHAR(3) NOT NULL, owner_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(tenant_id,idempotency_key), UNIQUE(tenant_id,id));
CREATE TABLE IF NOT EXISTS fulfillment_lines (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, order_id UUID NOT NULL, inventory_key TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0),
 unit_price_cents BIGINT NOT NULL CHECK(unit_price_cents>=0), held_quantity INTEGER NOT NULL DEFAULT 0, fulfilled_quantity INTEGER NOT NULL DEFAULT 0, UNIQUE(tenant_id,order_id,inventory_key));
CREATE TABLE IF NOT EXISTS fulfillment_deliveries (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, order_id UUID NOT NULL, provider_type TEXT NOT NULL, idempotency_key TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','acknowledged','retrying','dead_letter')), attempt_count INTEGER NOT NULL DEFAULT 0,
 next_attempt_at TIMESTAMPTZ, receipt JSONB, last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(tenant_id,provider_type,idempotency_key));
CREATE TABLE IF NOT EXISTS fulfillment_exceptions (id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, order_id UUID NOT NULL, exception_type TEXT NOT NULL, disposition TEXT, evidence JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS fulfillment_audit (id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, order_id UUID NOT NULL, actor_id TEXT NOT NULL, action TEXT NOT NULL, from_status TEXT, to_status TEXT, record_version INTEGER NOT NULL, evidence JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE OR REPLACE FUNCTION reject_fulfillment_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fulfillment audit is append-only'; END $$;
DROP TRIGGER IF EXISTS fulfillment_audit_append_only ON fulfillment_audit;
CREATE TRIGGER fulfillment_audit_append_only BEFORE UPDATE OR DELETE ON fulfillment_audit FOR EACH ROW EXECUTE FUNCTION reject_fulfillment_audit_mutation();
COMMIT;
