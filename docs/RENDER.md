# Launch REAP Market on Render

[Open the guided deployment](https://render.com/deploy?repo=https://github.com/tolbertinnovation-debug/REAP-M)

The repository includes a Render Blueprint (`render.yaml`) that configures the web service, Node runtime, build, health check and persistent database disk. It creates a live instance with an empty catalogue and no demonstration accounts. This is a paid hosting setup: review the actual service and disk charges displayed in your Render account before creating resources.

## Create the service

1. Open the guided deployment link, sign in to Render and connect the GitHub account that can access `tolbertinnovation-debug/REAP-M`.
2. Review the `reap-market` service and its 1 GB persistent disk. The configuration uses one 512 MB service in Frankfurt. If you have already created a REAP service manually, inspect that service first to avoid creating a second instance and separate database.
3. Enter the values requested by Render:

| Field                | What to enter                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ADMIN_EMAIL`        | The email address you will use to sign in as administrator                                                    |
| `ADMIN_PASSWORD`     | A unique password of 12–128 characters; save it in your password manager                                      |
| `DELIVERY_FEE_CENTS` | The approved flat delivery fee in whole USD cents; for example, `500` means US$5, and `0` means free delivery |
| `DELIVERY_AREA`      | The actual areas REAP can deliver to                                                                          |
| `SUPPORT_EMAIL`      | A monitored customer support email address                                                                    |

4. Review the charges and create the Blueprint resources. Watch the build and deploy in Render until the service becomes **Live**.
5. Open the HTTPS address assigned by Render. The Blueprint derives `PUBLIC_ORIGIN` from that exact address, so it does not require a guessed hostname or a second configuration step for initial login.
6. Open `https://YOUR-RENDER-ADDRESS/#/admin` and sign in with the administrator details you entered. Change the password in the account security screen. Remove `ADMIN_PASSWORD` from the service's environment after the first administrator exists. It is only a bootstrap value; removing it does not remove the account.

The Blueprint prompts for private values only on initial creation. Later changes to delivery fees, areas, support details or provider credentials belong in the service's **Environment** settings. Never put actual passwords or API keys in the repository or a chat message.

## Prepare for customers

Add approved products, descriptions, prices, stock and staff accounts. Confirm the delivery area and charge shown at checkout. Add `SUPPORT_WHATSAPP` in Render if REAP has an approved support number. Place a controlled order, verify stock, tracking, invoice and payment recording, and restart the service to confirm the records persist.

The SQLite database is `/var/data/market.sqlite`, inside the persistent disk. Keep the service at one instance. Do not move the database outside `/var/data` or replace/delete the disk during an update. Deployments with an attached disk can have a brief interruption.

Configure consistent database backups using `server/backup.mjs` and keep copies outside this service. See [DEPLOYMENT.md](DEPLOYMENT.md#backups). The disk is persistent storage, not an independent backup.

External messaging is initially disabled. Configure verified provider accounts according to [INTEGRATIONS.md](INTEGRATIONS.md) before enabling it. Payments are recorded after manual verification; no live payment gateway is enabled by deployment.

## Add market.reapwestafrica.org

If you can manage DNS for `reapwestafrica.org`:

1. In Render, open the service's **Settings → Custom Domains**, add `market.reapwestafrica.org`, and follow Render's displayed DNS instructions for that subdomain.
2. Verify the domain in Render and wait for its HTTPS certificate to become active.
3. Update the `PUBLIC_ORIGIN` entry in `render.yaml`: replace its `fromService` block with `value: https://market.reapwestafrica.org`. Commit and sync the Blueprint. This keeps future Blueprint syncs from restoring the original Render URL.
4. Use the custom domain for all administrator and customer actions. After confirming it works, you can disable the default Render subdomain in the service settings.

This adds a separate market subdomain; it does not require pointing the existing institutional website's root domain to this application.

## Updates and troubleshooting

The Blueprint uses `autoDeployTrigger: checksPass`, so subsequent automatic deployments wait for successful GitHub checks. Back up the database before deploying a change that alters its schema.

| Symptom                                                         | Check                                                                                                           |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Build cannot find Vite                                          | Keep `--include=dev` in the build command; the production build needs development dependencies                  |
| Service cannot start                                            | Check the deploy logs, required environment values and the database disk mount                                  |
| Login or checkout reports an origin error                       | `PUBLIC_ORIGIN` must match the exact HTTPS origin in the browser, without a path or trailing slash              |
| Records appear missing                                          | Check `DEMO_MODE=false` and that `DB_PATH` points to the existing persistent disk before making further changes |
| Administrator password no longer matches the bootstrap variable | Use the current account password; changing `ADMIN_PASSWORD` does not reset an existing account                  |

The Blueprint was checked against Render’s official JSON schema. A local production smoke check verified health, an empty live catalogue, login with the configured HTTPS origin, rejection of another origin, Secure cookies, and administrator persistence after restart without the bootstrap password.

Configuration validation is not evidence of a completed live deployment. Confirm the **Live** state and an end-to-end order on your actual service before launch.

References: [Render Blueprints](https://render.com/docs/blueprint-spec), [default environment variables](https://render.com/docs/environment-variables), [persistent disks](https://render.com/docs/disks), [custom domains](https://render.com/docs/custom-domains), [pricing](https://render.com/pricing).
