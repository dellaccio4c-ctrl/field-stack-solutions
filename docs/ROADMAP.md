# FSS Portal — Competitive Roadmap

Source: Premium Feature Benchmark vs Jobber / ServiceTitan / MaintainX / ServiceNow (July 2026).
Corrected against the REAL portal (the benchmark reviewed the old marketing-page demo).

## Corrections — already built in the live portal

| Benchmark said | Reality |
|---|---|
| ❌ Asset & equipment records | ✅ Equipment module: per-site registry, brand/model/serial/unit #, install date, warranty expiry alerts, lifetime service history. (QR codes: not yet) |
| ❌ Parts & inventory management | ✅ Inventory module: tools/parts/computers, stock levels, min-stock alerts, check-out to employees, audited movements. (PO's/per-job parts: not yet) |
| ❌ Digital quotes with e-approval | ✅ Estimates: emailed PDF + customer portal approve/decline online. (Open-tracking + automated follow-ups: not yet) |
| 🟡 Mobile tech app | 🟡 Responsive web app: techs update status, camera photo capture, timestamps from phone. (Offline mode/dedicated app: not yet) |
| 🟡 Multi-location accounts | ✅ Unlimited sites per customer, per-site totals, per-site CSV exports, per-site equipment filter |
| ❌ Recurring PM automation | 🟡 Pump Route Scheduler projects recurring service windows per site. (Auto-generating work orders from schedule: not yet) |
| 🟡 KPI dashboard | 🟡 Owner financials KPIs exist; work-order metrics partial (time-to-complete per WO) |
| ❌ Audit logs | 🟡 Work orders have immutable timestamped event logs; inventory has movement logs. (Global audit trail: not yet) |

## True gaps — prioritized build order

### Tier 1 (near-term, high impact, fits current architecture)
1. **PM work-order automation** — auto-generate work orders when pump sites / equipment hit their service window (we have both schedules and WOs; this is the connective tissue)
2. **QR codes on equipment** — print a QR per unit; scanning opens its history/new-WO page (huge field win, small build)
3. **Automated notifications** — email (Resend) then SMS (Twilio): booking confirmations, estimate reminders, "tech en route"
4. **Estimate follow-up automation** — drip reminders on unapproved estimates
5. **SLA timers** — response/resolution countdown per priority level with breach flags (differentiator for multi-site contracts)

### Tier 2 (v2)
6. Job costing — labor (minutes on site × rate) + parts (inventory consumption per WO) vs invoice
7. Customer self-scheduling from live availability
8. QuickBooks sync
9. Drag-and-drop dispatch board with tech load view
10. Approval workflows — spend limits requiring customer-manager sign-off
11. Per-location budgets & reporting rollups

### Tier 3 (later / enterprise)
12. Route optimization + GPS fleet tracking
13. AI dispatch assignment
14. Offline-capable mobile app (PWA)
15. SSO + global audit log
16. Financing at quote; good-better-best quote options; flat-rate pricebook
17. Review management (Google review requests post-completion)
18. IoT/meter-triggered work orders
19. Open API / integrations
20. AI assistant (natural-language search over portal data) — committed for v1 final
