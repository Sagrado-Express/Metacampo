/**
 * MetaCampo — Base Master Mensal (Faturamento YTD + Budget + Clientes)
 * Structured for GTM-GC "Macro to Micro" hierarchical filtering.
 * Fields: mes, ctvId, ctvName, gerenteId, gerenteName, documento, clientName, segmento, meta, realizado
 */

export const MONTHLY_MASTER_BASE = [
  // ─── MÊS 04 — ABRIL ───────────────────────────────────
  // Gerente: Ricardo Oliveira (G01) | CTV: Joao Silva
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "04", ctvId: "CTV01", ctvName: "Joao Silva",         gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233301", clientName: "Fazenda Esperança",   segmento: "Sementes",      meta: 480000, realizado: 360000, pedidos: 50000 },
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "04", ctvId: "CTV01", ctvName: "Joao Silva",         gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233302", clientName: "Fazenda Boa Vista",   segmento: "Fertilizantes", meta: 750000, realizado: 600000, pedidos: 80000 },
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "04", ctvId: "CTV01", ctvName: "Joao Silva",         gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233303", clientName: "Fazenda Progressiva", segmento: "Agroquímicos",  meta: 560000, realizado: 520000, pedidos: 20000 },
  // Gerente: Ricardo Oliveira (G01) | CTV: Beatriz Santos
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "04", ctvId: "CTV02", ctvName: "Beatriz Santos",     gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233306", clientName: "Fazenda Santa Maria", segmento: "Sementes",      meta: 380000, realizado: 200000, pedidos: 60000 },
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "04", ctvId: "CTV02", ctvName: "Beatriz Santos",     gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233307", clientName: "Fazenda Sol Nascente",segmento: "Fertilizantes", meta: 660000, realizado: 620000, pedidos: 15000 },
  // Gerente: Ricardo Oliveira (G01) | CTV: Carlos Gomes
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "04", ctvId: "CTV03", ctvName: "Carlos Gomes",       gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233311", clientName: "Fazenda Palmeiras",   segmento: "Agroquímicos",  meta: 860000, realizado: 220000, pedidos: 120000 },
  // Gerente: Ana Paula Costa (G02) | CTV: Fernanda Melo
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "04", ctvId: "CTV04", ctvName: "Fernanda Melo",      gerenteId: "G02", gerenteName: "Ana Paula Costa",  documento: "11122233326", clientName: "Fazenda Cerrado",     segmento: "Sementes",      meta: 920000, realizado: 800000, pedidos: 40000 },
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "04", ctvId: "CTV04", ctvName: "Fernanda Melo",      gerenteId: "G02", gerenteName: "Ana Paula Costa",  documento: "11122233326", clientName: "Fazenda Cerrado",     segmento: "Fertilizantes", meta: 480000, realizado: 460000, pedidos: 10000 },
  // Gerente: Ana Paula Costa (G02) | CTV: Gabriel Neves
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "04", ctvId: "CTV05", ctvName: "Gabriel Neves",      gerenteId: "G02", gerenteName: "Ana Paula Costa",  documento: "11122233331", clientName: "Fazenda Sapezal",    segmento: "Sementes",      meta: 1100000,realizado: 980000, pedidos: 50000 },
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "04", ctvId: "CTV05", ctvName: "Gabriel Neves",      gerenteId: "G02", gerenteName: "Ana Paula Costa",  documento: "11122233331", clientName: "Fazenda Sapezal",    segmento: "Agroquímicos",  meta: 750000, realizado: 710000, pedidos: 20000 },
  // Gerente: Ricardo Oliveira (G01) | CTV: Daniela Lima
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "04", ctvId: "CTV06", ctvName: "Daniela Lima",       gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233316", clientName: "Fazenda Terra Rica",  segmento: "Sementes",      meta: 410000, realizado: 390000, pedidos: 10000 },
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "04", ctvId: "CTV06", ctvName: "Daniela Lima",       gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233316", clientName: "Fazenda Terra Rica",  segmento: "Fertilizantes", meta: 320000, realizado: 280000, pedidos: 15000 },
  // Gerente: Ana Paula Costa (G02) | CTV: Fernanda Melo (second client)
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "04", ctvId: "CTV04", ctvName: "Fernanda Melo",      gerenteId: "G02", gerenteName: "Ana Paula Costa",  documento: "11122233321", clientName: "Fazenda Jatobá",     segmento: "Agroquímicos",  meta: 500000, realizado: 330000, pedidos: 90000 },

  // ─── MÊS 05 — MAIO ────────────────────────────────────
  // G01 — CTV01: Joao Silva
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "05", ctvId: "CTV01", ctvName: "Joao Silva",         gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233301", clientName: "Fazenda Esperança",   segmento: "Sementes",      meta: 500000, realizado: 320000, pedidos: 80000 },
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "05", ctvId: "CTV01", ctvName: "Joao Silva",         gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233302", clientName: "Fazenda Boa Vista",   segmento: "Fertilizantes", meta: 800000, realizado: 450000, pedidos: 150000 },
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "05", ctvId: "CTV01", ctvName: "Joao Silva",         gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233303", clientName: "Fazenda Progressiva", segmento: "Agroquímicos",  meta: 600000, realizado: 580000, pedidos: 10000 },
  // G01 — CTV02: Beatriz Santos
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "05", ctvId: "CTV02", ctvName: "Beatriz Santos",     gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233306", clientName: "Fazenda Santa Maria", segmento: "Sementes",      meta: 400000, realizado: 150000, pedidos: 120000 },
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "05", ctvId: "CTV02", ctvName: "Beatriz Santos",     gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233307", clientName: "Fazenda Sol Nascente",segmento: "Fertilizantes", meta: 700000, realizado: 680000, pedidos: 10000 },
  // G01 — CTV03: Carlos Gomes
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "05", ctvId: "CTV03", ctvName: "Carlos Gomes",       gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233311", clientName: "Fazenda Palmeiras",   segmento: "Agroquímicos",  meta: 900000, realizado: 200000, pedidos: 350000 },
  // G01 — CTV06: Daniela Lima
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "05", ctvId: "CTV06", ctvName: "Daniela Lima",       gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233316", clientName: "Fazenda Terra Rica",  segmento: "Sementes",      meta: 420000, realizado: 410000, pedidos: 5000 },
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "05", ctvId: "CTV06", ctvName: "Daniela Lima",       gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233316", clientName: "Fazenda Terra Rica",  segmento: "Fertilizantes", meta: 330000, realizado: 300000, pedidos: 20000 },
  // G02 — CTV04: Fernanda Melo
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "05", ctvId: "CTV04", ctvName: "Fernanda Melo",      gerenteId: "G02", gerenteName: "Ana Paula Costa",  documento: "11122233326", clientName: "Fazenda Cerrado",     segmento: "Sementes",      meta: 950000, realizado: 870000, pedidos: 60000 },
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "05", ctvId: "CTV04", ctvName: "Fernanda Melo",      gerenteId: "G02", gerenteName: "Ana Paula Costa",  documento: "11122233326", clientName: "Fazenda Cerrado",     segmento: "Fertilizantes", meta: 500000, realizado: 480000, pedidos: 15000 },
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "05", ctvId: "CTV04", ctvName: "Fernanda Melo",      gerenteId: "G02", gerenteName: "Ana Paula Costa",  documento: "11122233321", clientName: "Fazenda Jatobá",     segmento: "Agroquímicos",  meta: 510000, realizado: 350000, pedidos: 80000 },
  // G02 — CTV05: Gabriel Neves
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "05", ctvId: "CTV05", ctvName: "Gabriel Neves",      gerenteId: "G02", gerenteName: "Ana Paula Costa",  documento: "11122233331", clientName: "Fazenda Sapezal",    segmento: "Sementes",      meta: 1150000,realizado: 1050000, pedidos: 80000 },
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "05", ctvId: "CTV05", ctvName: "Gabriel Neves",      gerenteId: "G02", gerenteName: "Ana Paula Costa",  documento: "11122233331", clientName: "Fazenda Sapezal",    segmento: "Agroquímicos",  meta: 780000, realizado: 740000, pedidos: 30000 },

  // ─── MÊS 06 — JUNHO (Parcial) ─────────────────────────
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "06", ctvId: "CTV01", ctvName: "Joao Silva",         gerenteId: "G01", gerenteName: "Ricardo Oliveira", documento: "11122233301", clientName: "Fazenda Esperança",   segmento: "Sementes",      meta: 600000, realizado: 0, pedidos: 150000 },
  { tenantId: "00000000-0000-0000-0000-000000000000", mes: "06", ctvId: "CTV04", ctvName: "Fernanda Melo",      gerenteId: "G02", gerenteName: "Ana Paula Costa",  documento: "11122233326", clientName: "Fazenda Cerrado",     segmento: "Sementes",      meta: 980000, realizado: 0, pedidos: 320000 },
];

// Available filters derived from the master base
export const MONTHS_AVAILABLE = ["04", "05", "06"];
export const MONTH_LABELS: Record<string, string> = {
  "04": "Abril", "05": "Maio", "06": "Junho"
};

export const TERRITORY_COORDINATES: Record<string, { x: number; y: number; uf: string }> = {
  "Sorriso":                  { x: 38, y: 32, uf: "MT" },
  "Sinop":                    { x: 40, y: 25, uf: "MT" },
  "Lucas do Rio Verde":       { x: 37, y: 39, uf: "MT" },
  "Sapezal":                  { x: 25, y: 42, uf: "MT" },
  "Rio Verde":                { x: 54, y: 58, uf: "GO" },
  "Jataí":                    { x: 49, y: 63, uf: "GO" },
  "Unaí":                     { x: 68, y: 53, uf: "MG" },
  "Luís Eduardo Magalhães":   { x: 78, y: 38, uf: "BA" },
  "Cascavel":                 { x: 44, y: 82, uf: "PR" },
};
