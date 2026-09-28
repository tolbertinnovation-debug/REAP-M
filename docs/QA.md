# Verification record

Validated on 28 September 2026 using Node 24.19.0, Playwright 1.63.0 and headless Chromium 134 on Linux. This records the tested implementation, not a production security certification.

## Automated results

| Check                             | Result                                               |
| --------------------------------- | ---------------------------------------------------- |
| API and security regression suite | 22 tests passed                                      |
| Browser workflow suite            | 8 checks passed; no browser runtime errors           |
| Production frontend build         | Passed                                               |
| npm dependency audit              | No known vulnerabilities reported at validation time |
| Consistent SQLite backup          | Integrity check passed; seeded order count preserved |

The API suite covers server-authoritative prices, atomic inventory reservations, concurrent overselling, idempotency, promotion limits, cancellation restoration, verified payments/refunds, role authorization, session cookies, CSRF and origin validation, account ownership, inbox privacy, password whitespace, marketing consent, staff session revocation, CSV formula escaping, financial totals, security headers and separation of demo/live databases.

The browser suite checks catalogue search, adding products to the basket, delivery and a promotion, guest checkout and private tracking, customer login/history/messages/logout, all main administrator sections, product creation, inventory adjustments and expense entry. It also exercises mobile menus and page widths. The machine-readable results are in [browser-results.json](browser-results.json).

## Responsive and accessibility checks

Desktop: 1440 × 1000. Mobile: 390 × 844 and 360 × 844.

The administrator sections fit both mobile widths without page-level horizontal overflow. Wide tables remain within horizontally scrollable containers. Customer pages fit the tested 390-pixel viewport. Desktop and mobile storefront/dashboard screenshots are in [screenshots](screenshots/).

Automated axe scans using WCAG 2 A/AA and WCAG 2.1 AA tags reported no violations on the tested home, shop, tracking, checkout confirmation and dashboard views. Form labels explicitly reference their controls and keep help text in accessible descriptions. These automated scans do not replace manual assistive-technology testing across every workflow.

## Reproduce

```bash
npm ci
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:browser
npm audit
```

The browser test starts its own application and temporary demo database, then removes that database. If Chromium is supplied by the environment, set `CHROMIUM_PATH` to its executable. Screenshots and results are refreshed by the test. GitHub Actions runs the API suite, build and browser suite on pushes and pull requests.

## Operational items outside this validation

No production host or public domain has been provisioned. No real payment was charged and no external email, SMS or WhatsApp message was sent. Provider credentials and sender approval, real product prices and photos, delivery terms, backup restoration on the target host, and a controlled live acceptance order remain launch setup tasks. Payment recording and ad reporting are manual. Deployment boundaries and identity recovery limitations are documented in [DEPLOYMENT.md](DEPLOYMENT.md) and [INTEGRATIONS.md](INTEGRATIONS.md).
