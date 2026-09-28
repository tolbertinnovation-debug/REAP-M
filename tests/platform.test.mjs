import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createApp } from "../server/app.mjs";
import { openDatabase } from "../server/db.mjs";
import { csv } from "../server/security.mjs";

let app, base, folder, admin, sales, dispatch, accountant, customer;
function client() {
  return {
    cookie: "",
    csrf: "",
    async request(path, data, overrides = {}) {
      const r = await fetch(base + "/api" + path, {
        method: data === undefined ? "GET" : "POST",
        headers: {
          ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(this.cookie ? { Cookie: this.cookie } : {}),
          ...(this.csrf ? { "X-CSRF-Token": this.csrf } : {}),
          ...overrides,
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      });
      const setCookie = r.headers.get("set-cookie");
      if (setCookie) this.cookie = setCookie.split(";")[0];
      const value = await r.json();
      if (value.csrf) this.csrf = value.csrf;
      return { status: r.status, data: value, headers: r.headers };
    },
  };
}
const order = (extra = {}) => ({
  items: [{ product_id: "pork", quantity: 2 }],
  fulfillment: "pickup",
  name: "Test Customer",
  email: "test@example.test",
  phone: "+231770000000",
  address: "Test address, Monrovia",
  preferred_date: new Date().toISOString().slice(0, 10),
  notes: "",
  payment_method: "cash",
  idempotency_key: randomUUID(),
  ...extra,
});
before(async () => {
  folder = mkdtempSync(join(tmpdir(), "reap-test-"));
  app = await createApp({ demo: true, dbPath: join(folder, "test.sqlite") });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  base = "http://127.0.0.1:" + app.server.address().port;
  [admin, sales, dispatch, accountant, customer] = await Promise.all(
    ["admin", "sales", "dispatch", "accountant", "customer"].map(
      async (role) => {
        const c = client();
        const r = await c.request("/auth/demo", { role });
        assert.equal(r.status, 200);
        return c;
      },
    ),
  );
});
after(async () => {
  await app.close();
  rmSync(folder, { recursive: true, force: true });
});

test("public catalogue exposes active products and no customer records", async () => {
  const guest = client();
  const p = await guest.request("/products");
  assert.equal(p.status, 200);
  assert.ok(p.data.length >= 8);
  assert.equal((await guest.request("/admin/bootstrap")).status, 403);
});
test("sessions use HttpOnly SameSite cookies and are opaque", async () => {
  const c = client();
  const r = await c.request("/auth/demo", { role: "customer" });
  assert.match(r.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  assert.match(c.cookie, /^reap_session=[a-f0-9]{64}$/);
  assert.equal(r.data.user.password, undefined);
});
test("cross-origin writes and missing CSRF are rejected", async () => {
  const r = await admin.request(
    "/admin/inventory",
    { product_id: "pork", delta: 1, reason: "Test adjustment" },
    { "X-CSRF-Token": "" },
  );
  assert.equal(r.status, 403);
  const r2 = await client().request("/orders", order(), {
    Origin: "https://hostile.example",
  });
  assert.equal(r2.status, 403);
});
test("staff roles cannot access financial or administrator mutations", async () => {
  assert.equal(
    (
      await sales.request("/admin/expenses", {
        category: "Feed",
        description: "unauthorized",
        amount: 100,
        date: "2026-09-28",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await dispatch.request("/admin/inventory", {
        product_id: "pork",
        delta: 10,
        reason: "Denied",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await accountant.request("/admin/team", {
        name: "Bad",
        email: "bad@example.test",
        password: "a very long password",
        role: "admin",
      })
    ).status,
    403,
  );
  const d = await dispatch.request("/admin/bootstrap");
  assert.deepEqual(d.data.customers, []);
  assert.deepEqual(d.data.payments, []);
  assert.deepEqual(d.data.team, []);
});
test("checkout uses server prices, reserves stock and creates private tracking", async () => {
  const c = client();
  const before = (await c.request("/products")).data.find(
    (p) => p.id === "pork",
  ).stock;
  const result = await c.request(
    "/orders",
    order({ total: 1, items: [{ product_id: "pork", quantity: 2, price: 1 }] }),
  );
  assert.equal(result.status, 200);
  assert.equal(result.data.total, 900);
  assert.equal(result.data.paid, 0);
  assert.equal(result.data.status, "received");
  assert.equal(result.data.tracking_token.length, 64);
  assert.equal(result.data.tracking_hash, undefined);
  const after = (await c.request("/products")).data.find(
    (p) => p.id === "pork",
  ).stock;
  assert.equal(before - after, 2);
  const tracked = await c.request("/track", {
    token: result.data.tracking_token,
  });
  assert.equal(tracked.data.id, result.data.id);
  assert.equal(
    (await c.request("/track", { token: "0".repeat(64) })).status,
    404,
  );
});
test("overselling and duplicate products are rejected without changing stock", async () => {
  const c = client();
  const before = (await c.request("/products")).data.find(
    (p) => p.id === "pig",
  ).stock;
  const results = await Promise.all([
    c.request(
      "/orders",
      order({ items: [{ product_id: "pig", quantity: before }] }),
    ),
    c.request(
      "/orders",
      order({ items: [{ product_id: "pig", quantity: before }] }),
    ),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const dup = await c.request("/quote", {
    items: [
      { product_id: "pork", quantity: 1 },
      { product_id: "pork", quantity: 1 },
    ],
    fulfillment: "pickup",
  });
  assert.equal(dup.status, 400);
});
test("delivery fees and active promotion are calculated on the server", async () => {
  const r = await client().request("/quote", {
    items: [{ product_id: "pork", quantity: 2 }],
    fulfillment: "delivery",
    promo_code: "fresh10",
    delivery_fee: 0,
    discount: 900,
  });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, {
    subtotal: 900,
    discount: 90,
    delivery_fee: 500,
    total: 1310,
  });
  assert.equal(
    (
      await client().request("/quote", {
        items: [{ product_id: "pork", quantity: 1 }],
        fulfillment: "pickup",
        promo_code: "FAKE",
      })
    ).status,
    400,
  );
});
test("orders cannot be submitted twice with one idempotency key", async () => {
  const c = client(),
    o = order();
  const first = await c.request("/orders", o);
  assert.equal(first.status, 200);
  assert.equal((await c.request("/orders", o)).status, 409);
});
test("cancellation restores stock exactly once and rejects invalid transitions", async () => {
  const c = client(),
    r = await c.request("/orders", order());
  assert.equal(r.status, 200);
  const before = (await c.request("/products")).data.find(
    (p) => p.id === "pork",
  ).stock;
  assert.equal(
    (
      await admin.request("/admin/order-status", {
        order_id: r.data.id,
        status: "completed",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await admin.request("/admin/order-status", {
        order_id: r.data.id,
        status: "cancelled",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await admin.request("/admin/order-status", {
        order_id: r.data.id,
        status: "cancelled",
      })
    ).status,
    409,
  );
  assert.equal(
    (await c.request("/products")).data.find((p) => p.id === "pork").stock,
    before + 2,
  );
});
test("payment records enforce due balances and refund-before-cancel", async () => {
  const c = client(),
    r = await c.request("/orders", order()),
    oid = r.data.id;
  const pay = (amount) =>
    accountant.request("/admin/payments", {
      order_id: oid,
      amount,
      method: "cash",
      reference: "Verified receipt test",
    });
  assert.equal((await pay(901)).status, 409);
  assert.equal((await pay(900)).status, 200);
  assert.equal((await pay(1)).status, 409);
  assert.equal(
    (
      await admin.request("/admin/order-status", {
        order_id: oid,
        status: "cancelled",
      })
    ).status,
    409,
  );
  assert.equal((await pay(-901)).status, 409);
  assert.equal((await pay(-900)).status, 200);
  assert.equal(
    (
      await admin.request("/admin/order-status", {
        order_id: oid,
        status: "cancelled",
      })
    ).status,
    200,
  );
});
test("negative stock and invalid amounts cannot corrupt inventory", async () => {
  assert.equal(
    (
      await admin.request("/admin/inventory", {
        product_id: "pork",
        delta: -100000,
        reason: "Impossible loss",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await admin.request("/admin/inventory", {
        product_id: "pork",
        delta: 0,
        reason: "No-op",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await admin.request("/admin/expenses", {
        category: "Feed",
        description: "Negative expense",
        amount: -100,
        date: "2026-09-28",
      })
    ).status,
    400,
  );
});
test("customers see only orders placed using their account", async () => {
  const guest = client();
  const guestOrder = await guest.request(
    "/orders",
    order({ email: "customer@example.test" }),
  );
  const mine = await customer.request(
    "/orders",
    order({ email: "spoof@example.test" }),
  );
  assert.equal(mine.data.email, "customer@example.test");
  const history = (await customer.request("/my/orders")).data;
  assert.ok(history.some((o) => o.id === mine.data.id));
  assert.ok(!history.some((o) => o.id === guestOrder.data.id));
  assert.equal((await customer.request("/admin/bootstrap")).status, 403);
});
test("inbox messages stay scoped to the signed-in customer", async () => {
  assert.equal(
    (await customer.request("/my/messages", { body: "Where is my order?" }))
      .status,
    200,
  );
  const other = client();
  const r = await other.request("/auth/register", {
    name: "Another buyer",
    email: "another@example.test",
    password: "a-strong-test-password-2026",
  });
  assert.equal(r.status, 200);
  assert.deepEqual((await other.request("/my/messages")).data, []);
  assert.equal(
    (await customer.request("/my/messages")).data.at(-1).body,
    "Where is my order?",
  );
});
test("registration cannot grant staff access; sign-in rejects bad passwords", async () => {
  const c = client();
  const r = await c.request("/auth/register", {
    name: "Role test",
    email: "role-test@example.test",
    password: "a-strong-role-test-password",
    role: "admin",
  });
  assert.equal(r.data.user.role, "customer");
  await c.request("/auth/logout", {});
  assert.equal(
    (
      await c.request("/auth/login", {
        email: "role-test@example.test",
        password: "bad password",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await c.request("/auth/login", {
        email: "role-test@example.test",
        password: "a-strong-role-test-password",
      })
    ).status,
    200,
  );
});

test("passwords retain intentional leading and trailing spaces", async () => {
  const c = client(),
    credentials = {
      email: "spaces@example.test",
      password: " a long passphrase with spaces ",
    };
  assert.equal(
    (await c.request("/auth/register", { ...credentials, name: "Spaces test" }))
      .status,
    200,
  );
  await c.request("/auth/logout", {});
  assert.equal((await c.request("/auth/login", credentials)).status, 200);
});
test("marketing consent is checked and the demo cannot send messages", async () => {
  const no = await admin.request("/admin/messages", {
    customer_id: "c0",
    channel: "email",
    purpose: "marketing",
    subject: "New harvest",
    body: "Sample offer",
  });
  assert.equal(no.status, 400);
  const yes = await admin.request("/admin/messages", {
    customer_id: "c1",
    channel: "email",
    purpose: "marketing",
    subject: "New harvest",
    body: "Sample offer",
  });
  assert.equal(yes.status, 200);
  const msg = (await admin.request("/admin/bootstrap")).data.messages[0];
  assert.equal(msg.status, "draft");
  assert.equal(
    (await admin.request("/admin/send-message", { id: msg.id })).status,
    409,
  );
});
test("bookkeeping totals reconcile with recorded transactions", async () => {
  const r = await accountant.request(
    "/admin/reports?from=2000-01-01&to=2099-12-31",
  );
  assert.equal(r.status, 200);
  const receipts = app.db.prepare("SELECT SUM(amount) n FROM payments").get().n;
  const expenses = app.db.prepare("SELECT SUM(amount) n FROM expenses").get().n;
  assert.equal(r.data.receipts, receipts);
  assert.equal(r.data.expenses, expenses);
  assert.equal(r.data.cash_surplus, receipts - expenses);
});
test("staff access changes revoke sessions and users cannot disable themselves", async () => {
  const r = await admin.request("/admin/team-access", {
    id: "demo-sales",
    role: "sales",
    active: false,
  });
  assert.equal(r.status, 200);
  assert.equal((await sales.request("/admin/bootstrap")).status, 403);
  assert.equal(
    (
      await admin.request("/admin/team-access", {
        id: "demo-admin",
        role: "sales",
        active: false,
      })
    ).status,
    400,
  );
});
test("demonstration databases cannot silently become live databases", () => {
  assert.throws(
    () => openDatabase(join(folder, "test.sqlite"), false),
    /separate databases/,
  );
});
test("CSV exports neutralize spreadsheet formulas", () => {
  const output = csv([["=1+1", "+cmd", "@SUM(A1)", "safe", 'a"b']]);
  assert.match(output, /"'=1\+1"/);
  assert.match(output, /"'\+cmd"/);
  assert.match(output, /"a""b"/);
});
test("HTTP responses carry framing, script, and caching protections", async () => {
  const r = await customer.request("/session");
  assert.equal(r.headers.get("x-frame-options"), "DENY");
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.match(r.headers.get("content-security-policy"), /script-src 'self'/);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
});

test("live startup omits sample records and demo login, and sets Secure cookies", async () => {
  const previousEmail = process.env.ADMIN_EMAIL,
    previousPassword = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_EMAIL = "live-test@example.test";
  process.env.ADMIN_PASSWORD = "a-unique-production-test-password";
  let live;
  try {
    live = await createApp({
      demo: false,
      production: true,
      origin: "https://market.example.test",
      dbPath: join(folder, "live.sqlite"),
    });
    await new Promise((r) => live.server.listen(0, "127.0.0.1", r));
    const url = "http://127.0.0.1:" + live.server.address().port;
    assert.deepEqual(await (await fetch(url + "/api/products")).json(), []);
    const demo = await fetch(url + "/api/auth/demo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://market.example.test",
      },
      body: JSON.stringify({ role: "admin" }),
    });
    assert.equal(demo.status, 404);
    const login = await fetch(url + "/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://market.example.test",
      },
      body: JSON.stringify({
        email: "live-test@example.test",
        password: "a-unique-production-test-password",
      }),
    });
    assert.equal(login.status, 200);
    assert.match(login.headers.get("set-cookie"), /; Secure/);
    assert.ok(login.headers.get("strict-transport-security"));
  } finally {
    if (live) await live.close();
    if (previousEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousEmail;
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previousPassword;
  }
});
