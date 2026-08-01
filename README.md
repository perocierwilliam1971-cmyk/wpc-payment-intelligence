# WPC Payment Intelligence™ V9 Beta 003 — Hotfix 3

Internal beta patch.

## Corrected
- Prioritizes DBA Name before legal Business Name when both are present
- Stops merchant-name extraction at DBA and other recognized labels
- Detects Equipment / Terminal Fee variants
- Detects Chargeback Fee variants
- Aligns severe Tiered/F-grade results with High priority
- Renames "Hidden Fees Found" to "Reviewable Fees Identified"

## Regression target
Bella Napoli Pizzeria Tiered Pricing test statement:
- Merchant: Bella Napoli Pizzeria
- Processor: Worldpay
- Pricing model: Tiered
- Reviewable fees: 5
- Annual fee impact: $1,414.80
- Priority: High
