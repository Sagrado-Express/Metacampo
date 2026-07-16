# Index Performance Validation — EXPLAIN ANALYZE

## Objective
Validate that the new indexes on `tenant_id` columns improve query performance.

## Test Cases

### Test 1: Query on `customers` table (before and after index)

**Query:**
```sql
EXPLAIN ANALYZE
SELECT * FROM public.customers 
WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
```

**Expected Plan (BEFORE index):**
```
Seq Scan on customers  (cost=0.00..25.00 rows=10 width=500)
  Filter: (tenant_id = '00000000-0000-0000-0000-000000000000')
  Rows: 10  Loop: 1  Time: 2.5 ms
```

**Expected Plan (AFTER index `idx_customers_tenant_id`):**
```
Index Scan using idx_customers_tenant_id on customers  (cost=0.29..2.51 rows=10 width=500)
  Index Cond: (tenant_id = '00000000-0000-0000-0000-000000000000')
  Rows: 10  Loop: 1  Time: 0.15 ms
```

**Performance gain: ~16x faster** (2.5ms → 0.15ms)

---

### Test 2: Query on `customer_crop_areas` with JOIN (common use case)

**Query:**
```sql
EXPLAIN ANALYZE
SELECT c.*, a.*
FROM public.customers c
JOIN public.customer_crop_areas a ON c.id = a.customer_id
WHERE c.tenant_id = '00000000-0000-0000-0000-000000000000';
```

**Expected Plan (AFTER indexes):**
```
Hash Join  (cost=2.51..15.00 rows=50 width=700)
  Hash Cond: (a.customer_id = c.id)
  ->  Index Scan using idx_customer_crop_areas_tenant_id on customer_crop_areas a
        Index Cond: (tenant_id = '00000000-0000-0000-0000-000000000000')
  ->  Hash  (cost=2.21..2.21 rows=10 width=300)
        ->  Index Scan using idx_customers_tenant_id on customers c
              Index Cond: (tenant_id = '00000000-0000-0000-0000-000000000000')
Rows: 50  Time: 0.35 ms
```

---

### Test 3: Dashboard-Full Query Simulation

**Simulated aggregate query (all 6 tables from `/api/planejamento/dashboard-full`):**

```sql
EXPLAIN ANALYZE
SELECT 
  COUNT(c.id) as customer_count,
  COUNT(DISTINCT a.id) as crop_areas_count,
  COUNT(DISTINCT it.id) as it_configs_count
FROM public.customers c
LEFT JOIN public.customer_crop_areas a ON a.customer_id = c.id
LEFT JOIN public.it_se_configurations it ON it.tenant_id = c.tenant_id
WHERE c.tenant_id = '00000000-0000-0000-0000-000000000000';
```

**Expected Performance Metrics:**
- **Full table scan (no index):** ~50-100ms
- **With indexes:** ~2-5ms
- **Improvement:** 10-20x faster

---

## How to Run Validation

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to Supabase Dashboard → SQL Editor
2. Copy/paste any of the EXPLAIN ANALYZE queries above
3. Run and observe the query plan
4. Compare costs and execution time

### Option 2: Using psql (CLI)

```bash
psql postgresql://postgres:[PASSWORD]@jcnxinvycgluoeqixdul.supabase.co:5432/postgres

# Then run:
EXPLAIN ANALYZE
SELECT * FROM public.customers 
WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
```

---

## Validation Checklist

- [ ] Indexes created successfully (8 indexes on core tables)
- [ ] `EXPLAIN ANALYZE` shows index scans instead of seq scans
- [ ] Query costs are significantly lower
- [ ] Execution time improved (>50% reduction expected)
- [ ] RLS policies still enforced correctly after indexing

## Notes

- Indexes are created with `IF NOT EXISTS` to be idempotent
- Multi-column indexes (e.g., `tenant_id, customer_id`) support queries filtering by both columns
- Partial indexes on frequently filtered boolean columns could be added in future optimizations
- Monitor index size with: `SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid)) FROM pg_indexes WHERE tablename LIKE 'customers';`
