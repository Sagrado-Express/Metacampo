# Security Policy: GTM-GC

## Data Isolation
- All data access is controlled via **Supabase Row Level Security (RLS)**.
- Each profile is associated with a `user_id`, ensuring tenant isolation.

## Authentication
- Implementation of Supabase Auth with JWT.
- MFA (Multi-factor Authentication) support planned for Phase 5.

## Audit Logs
- All changes to portfolios and simulations are logged with `created_at` and `updated_by` fields using the `AuditLog` interface.

## Transient Middleware & Data Sovereignty (Memory-First)
- **Zero-Footprint Ingestion**: Raw data from CSV or external ERP APIs is processed exclusively in **volatile memory** (Vercel Edge Functions).
- **No Persistent Trace**: Raw billing data never touches the database. Only consolidated VPM results and strategic indicators are saved.
- **Immediate Discard**: Memory is purged immediately after the consolidation request, ensuring high security and cost reduction in encryption/decryption at rest.

## Data Integrity & Financial Security
- **Safe Math Protocol**: All financial aggregations use cent-based integer arithmetic (Safe Math) to prevent floating-point inaccuracy.
- **Atomic Operations**: All state transitions for Budgets and Potentials are idempotent, preventing duplication of realized values during ingestion retries.

