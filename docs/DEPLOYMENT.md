# Deployment and operations

## Production setup

1. Provision a Linux server with Docker and Compose, persistent disk storage, inbound ports 80/443 and a domain DNS record pointing to the server.
2. Clone this repository and copy `.env.example` to `.env`.
3. Set `MARKET_DOMAIN`, the matching HTTPS `PUBLIC_ORIGIN`, `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 12 characters. Confirm delivery area/fee and support contacts. Keep `DEMO_MODE=false` and `ENABLE_OUTBOUND=false` until the catalogue and provider setup are complete.
4. Run `docker compose up -d --build`. Caddy obtains and renews the TLS certificate. The API is accessible only through the proxy on the private Compose network.
5. Open `https://YOUR_DOMAIN/#/admin`, sign in, change the administrator password, and enter the approved products, descriptions, prices, stock and staff accounts.
6. Remove `ADMIN_PASSWORD` from the environment after bootstrapping; it is only needed while the live database has no administrator. Do not delete the persistent database.
7. Place a controlled test order and verify pickup/delivery, stock, invoice and payment records before inviting customers. Use real verified support contacts and approved payment instructions.

The container runs as an unprivileged user with a read-only root filesystem and a writable data volume. TLS terminates at Caddy. `TRUST_PROXY=true` is safe only when the application port is private and all requests come from that trusted proxy. Do not expose port 3000 publicly with that setting.

## Without Docker

Build with `npm ci && npm run build`. Start `node --env-file=.env server/index.mjs` under a process manager, using a writable `DB_PATH`, HTTPS reverse proxy and persistent storage. The runtime server has no npm dependencies. It uses Node's HTTP, crypto, filesystem and SQLite modules. `.env` is not automatically read by `npm start`; pass `--env-file` or configure the process manager environment.

## Demonstration hosting

Use a separate database volume and `DEMO_MODE=true`. Never collect real customer data in a publicly accessible demonstration: anyone can enter its sample administrator account. Production mode defaults to false for demo, excludes demo login routes, uses secure cookies and requires an explicit HTTPS origin when `NODE_ENV=production`.

## Backups

Use SQLite's backup API or a storage snapshot covering the database and WAL together. Do not copy only a live `.sqlite` file while the server is writing. An example consistent backup command is provided in `server/backup.mjs`. Store backups encrypted outside the web root and outside this public repository, and periodically test restoration into a separate instance. Keep the backup destination on durable storage.

For a simple stopped-service backup, stop the application gracefully before copying the data volume. Restore the entire backup to a separate volume first, confirm `PRAGMA integrity_check`, and verify sign-in, catalogue, order counts and financial totals. Set retention and recovery objectives with REAP before launch.

## Updates

Back up the database, pull the reviewed commit, run the test suite and rebuild the image. Existing databases are retained. This is schema version 1; future structural changes should use versioned migrations with a backup and rollback plan. Never point a demo and live process at the same file.

## Scale and limits

The initial architecture is one Node process with SQLite WAL on persistent local disk. Do not run multiple replicas with independent disks or mount SQLite on an unreliable shared filesystem. Scrypt uses the asynchronous Node worker pool for login and account creation; rate limits are in process and reset on restart.

For multiple instances: migrate the repository layer to PostgreSQL, move sessions and rate limits to shared storage, introduce a durable worker queue for outbound messages, and serve versioned product media from object storage/CDN. Preserve the transaction and authorization tests during migration. Add tracing, load testing, database indexes based on measured workloads, alerting and stronger perimeter rate limits.

Admin bootstrap views currently cap orders/customers/expenses/payments at 1,000 rows, stock movements at 200, messages at 500 and audit entries at 80. Financial reports query the full date range. CSV exports read all relevant rows. Add cursor-based database pagination before these working lists grow beyond those caps.

## Identity and recovery

No default live password is shipped. Customer email verification, self-service password reset and multifactor authentication are not implemented in this release. Account order history is linked to the authenticated account ID, so registering an email address never reveals past guest orders. Staff provisioning is administrator-only. Add verified recovery and MFA with a trusted identity provider before requiring higher assurance access policies.

Audit entries record staff and order activity in the same database. For tamper-resistant audit retention, forward logs to a separately controlled service. Define contact retention, backup retention and data access request procedures before collecting real customer data.
