# Infrastructure & Costs - Antigravity (Meta Campo) V3

This document details the architectural choices and cost management for the Antigravity MVP.

## 1. Cloud Stack & Budgeting

| Service | Tier | Purpose | Cost (Est.) |
| :--- | :--- | :--- | :--- |
| **Supabase** | Pro | Central vault for consolidated results, audit logs, and users. | ~R$ 125,00/mo |
| **Vercel** | Hobby/Pro | Hosting Next.js and high-performance Edge Functions. | R$ 0,00 |
| **Upstash** | Free | Redis cache for transient state during CSV processing. | R$ 0,00 |
| **Resend** | Free | Transactional emails for goal approvals. | R$ 0,00 |
| **Total** | | | **R$ 125,00/mo** |

**Target Budget Range**: R$ 100 - 150 / month.

## 2. "Memory-First" Middleware Architecture

To ensure **Data Sovereignty** and minimize storage costs, the system follows a transient approach:

1.  **Ingestion**: CSV billing data is uploaded via a standard layout.
2.  **Processing (Edge)**: Vercel Edge Functions parse the CSV in memory.
3.  **Transient Cache**: Upstash Redis is used if processing requires temporary cross-record state (e.g., deduplication or aggregation).
4.  **Consolidation**: Only the calculated VPM results and strategic indicators (Pareto, Confidence) are persisted to Supabase.
5.  **Purge**: Raw data is discarded immediately after processing. No PII (Personally Identifiable Information) from the ERP touches the persistent storage vault.

## 3. High Availability & Offline Strategy

*   **Offline-First**: Using TanStack Query Persistence for local browser cache.
*   **Edge Global Distribution**: Vercel Edge ensures low latency for CTVs in different regions of Brazil (Cerrado, Sul, etc.).
*   **Immutable Audit**: All final decisions (Area materialization, Adjusted Share) are logged in the Supabase audit vault for compliance.
