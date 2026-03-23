# Pricing: Admin-editable plans

This document explains the pricing feature added to the platform.

## Overview
- Admins can manage region-aware pricing plans via **Admin > Website CMS > Pricing** (new tab).
- Public API endpoint: `GET /api/pricing?country=IN` returns region-specific plans when available. If no region-specific plans exist, it returns the global plans.
- Admin API endpoints (require super_admin session):
  - `GET /api/admin/website/pricing` — list plans
  - `POST /api/admin/website/pricing` — create plan
  - `PUT /api/admin/website/pricing/:id` — update plan
  - `DELETE /api/admin/website/pricing/:id` — delete plan

## Database table
Table: `pricing_plans`

Columns (JS property names):
- `id` (uuid)
- `slug` (string)
- `displayName` (string)
- `region` (string | null) — `null` means global, use ISO country code (e.g., `IN`) for overrides
- `currency` (string) — `INR` or `USD` (stored as text)
- `priceHourlyMinor` (integer) — stored in minor units (paise for INR, cents for USD). Example: `INR 100` per hour = `10000` (paise)
- `perHireChargeMinor` (integer) — stored in minor units
- `internshipDuration` (string)
- `features` (jsonb) — list of feature strings
- `gstApplicable` (boolean) — if true, front-end will show the GST footnote in India
- `isActive`, `sortOrder`, `createdAt`, `updatedAt`

Notes:
- We store money in *minor units* to avoid floating point rounding errors (paise/cents).
- Admin UI converts major units (e.g., 100.00) to minor units when creating/updating.

## Frontend behavior
- The public Pricing page requests `/api/pricing` and sends a `country` query param if the browser indicates India via locale/timezone hints.
- If the returned plans have `gstApplicable` set, the page shows "* Price Includes GST"; otherwise the GST line is hidden.
- The page displays currency using the `currency` field from the plan (no automatic conversion yet).

## Next steps / TODO
- Add an optional exchange-rate conversion service to show USD prices when only INR is stored (or vice-versa).
- Add unit / integration tests that cover the API and admin flows.

---
If you'd like I can now add tests (jest / supertest) for the pricing API and wire an exchange-rate provider for conversion, or I can finish the remaining tasks. Let me know which you prefer.