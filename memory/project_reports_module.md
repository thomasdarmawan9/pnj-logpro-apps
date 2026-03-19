---
name: Reports Module
description: Financial reports module (Laporan Keuangan) completed — routes, architecture, business rules
type: project
---

Reports module (Modul Laporan Keuangan) completed on 2026-03-18.

**Pages:**
- `/laporan/aging-ar` — Aging AR (super_admin + admin_finance)
- `/laporan/profit-loss` — Profit & Loss per project (super_admin only)
- `/laporan/audit-trail` — Audit Trail (super_admin only)

**Architecture:** Clean Architecture under `features/reports/`
- `domain/` — AgingARReport, ProfitLossReport, AuditLog entities; AgingBucket, ProfitMargin value-objects
- `application/` — use-cases: GetAgingARReport, GetProfitLossReport, GetAuditTrail, ExportAgingARExcel, ExportProfitLossExcel; DTOs for each report
- `infrastructure/` — IReportsRepository interface + MockReportsRepository
- `presentation/` — pages, components, hooks

**Redux:** `store/slices/reportsSlice.ts` registered in store/index.ts
- State: agingAR, profitLoss, auditTrail sections

**Key dependencies added:** exceljs (for Excel export)
**Formatters:** `lib/formatters.ts` created with formatRupiah, formatRupiahShort, formatDate, formatDateTime, formatRelativeTime

**Why:** PRD v2.2 FINAL BAB 5.5 Modul Dashboard & Laporan
**How to apply:** Next module is Laporan Utilisasi Armada + Master Data + Pengaturan Sistem
