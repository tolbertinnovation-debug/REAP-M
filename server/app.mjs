import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, createReadStream } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { openDatabase, id, now } from "./db.mjs";
import {
  digest,
  token,
  fail,
  str,
  integer,
  email,
  choice,
  date,
  hashPassword,
  verifyPassword,
  passwordInput,
  roles,
  permit,
  createLimiter,
  csv,
} from "./security.mjs";
import { sendMessage, providerStatus } from "./providers.mjs";

const categories = [
  "Pork & livestock",
  "Fish & aquaculture",
  "Aquaponics",
  "Fresh produce",
  "Farm supplies",
  "Services",
];
const units = ["lb", "head", "bunch", "bundle", "tray", "bag", "service"];
const statuses = [
  "received",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
];
const publicUser = (u) =>
  u
    ? {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        scopes: roles[u.role],
      }
    : null;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".json": "application/json",
  ".ico": "image/x-icon",
};

export async function createApp(config = {}) {
  const demo = config.demo ?? process.env.DEMO_MODE === "true";
  const db = openDatabase(
    config.dbPath ||
      process.env.DB_PATH ||
      `data/${demo ? "demo" : "market"}.sqlite`,
    demo,
  );
  const production = config.production ?? process.env.NODE_ENV === "production";
  if (production && !process.env.PUBLIC_ORIGIN && !config.origin)
    throw new Error("PUBLIC_ORIGIN is required in production.");
  const origin = config.origin || process.env.PUBLIC_ORIGIN || "";
  if (production && !origin.startsWith("https://"))
    throw new Error("Production PUBLIC_ORIGIN must use HTTPS.");
  if (!demo && !db.prepare("SELECT id FROM users WHERE role='admin'").get()) {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
      throw new Error(
        "Set ADMIN_EMAIL and a unique ADMIN_PASSWORD (12+ characters) for the first live administrator.",
      );
    db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?,?)").run(
      id("usr_"),
      "REAP administrator",
      email(process.env.ADMIN_EMAIL),
      await hashPassword(process.env.ADMIN_PASSWORD),
      "admin",
      1,
      now(),
    );
  }
  const limit = createLimiter();
  const root = resolve(config.publicDir || "dist");
  const deliveryFee = integer(
    config.deliveryFee ?? Number(process.env.DELIVERY_FEE_CENTS || 500),
    "Delivery fee",
  );
  const audit = (actor, action, target, detail = "") =>
    db
      .prepare(
        "INSERT INTO audit(actor,action,target,detail,created_at) VALUES(?,?,?,?,?)",
      )
      .run(actor?.id || null, action, target, String(detail), now());
  const tx = (fn) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const v = fn();
      db.exec("COMMIT");
      return v;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  };
  const paid = (oid) =>
    Number(
      db
        .prepare(
          "SELECT COALESCE(SUM(amount),0) value FROM payments WHERE order_id=?",
        )
        .get(oid).value,
    );
  const orderView = (o) => {
    if (!o) return null;
    const { tracking_hash, idempotency_key, ...rest } = o;
    return {
      ...rest,
      paid: paid(o.id),
      items: db
        .prepare(
          "SELECT product_id,name,unit,price,quantity FROM order_items WHERE order_id=?",
        )
        .all(o.id),
      events: db
        .prepare(
          "SELECT status,created_at FROM order_events WHERE order_id=? ORDER BY id",
        )
        .all(o.id),
    };
  };
  const getOrders = () =>
    db
      .prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 1000")
      .all()
      .map(orderView);
  const clientIp = (req) =>
    process.env.TRUST_PROXY === "true"
      ? String(req.headers["x-forwarded-for"] || req.socket.remoteAddress)
          .split(",")[0]
          .trim()
      : req.socket.remoteAddress;
  function sessionFor(req) {
    const cookie = String(req.headers.cookie || "")
      .split(";")
      .find((c) => c.trim().startsWith("reap_session="));
    if (!cookie) return null;
    const raw = cookie.trim().slice("reap_session=".length);
    if (!/^[a-f0-9]{64}$/.test(raw)) return null;
    const sess = db
      .prepare(
        "SELECT s.csrf,s.expires,s.token,u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.active=1",
      )
      .get(digest(raw), Date.now());
    return sess || null;
  }
  function newSession(res, user) {
    const raw = token(),
      csrf = token();
    db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
    db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").run(
      digest(raw),
      user.id,
      csrf,
      Date.now() + 8 * 3600000,
    );
    res.setHeader(
      "Set-Cookie",
      `reap_session=${raw}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${production ? "; Secure" : ""}`,
    );
    return { user: publicUser(user), csrf };
  }
  async function body(req) {
    if (
      !String(req.headers["content-type"] || "").startsWith("application/json")
    )
      fail(415, "Send JSON request data.");
    let size = 0,
      parts = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 64000) fail(413, "Request is too large.");
      parts.push(chunk);
    }
    try {
      const b = JSON.parse(Buffer.concat(parts).toString());
      if (!b || Array.isArray(b) || typeof b !== "object")
        fail(400, "Invalid request body.");
      return b;
    } catch {
      fail(400, "Invalid JSON request body.");
    }
  }
  function promotion(code, subtotal) {
    if (!code) return { discount: 0, promo: null };
    const p = db
      .prepare(
        "SELECT * FROM promotions WHERE code=? COLLATE NOCASE AND active=1",
      )
      .get(str(code, "Promotion code", 30));
    if (!p || p.expires < now().slice(0, 10) || p.uses >= p.max_uses)
      fail(400, "This promotion is unavailable or has expired.");
    return { discount: Math.floor((subtotal * p.percent) / 100), promo: p };
  }
  function quote(b) {
    if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 30)
      fail(400, "Add 1–30 products to your basket.");
    const seen = new Set();
    const items = b.items.map((i) => {
      const pid = str(i.product_id, "Product", 80);
      if (seen.has(pid)) fail(400, "Duplicate product in basket.");
      seen.add(pid);
      const quantity = integer(i.quantity, "Quantity", 1, 1000);
      const p = db
        .prepare("SELECT * FROM products WHERE id=? AND active=1")
        .get(pid);
      if (!p) fail(400, "A product is no longer available.");
      if (quantity > p.stock)
        fail(409, `${p.name}: only ${p.stock} ${p.unit} available.`);
      return { ...p, quantity };
    });
    const fulfillment = choice(
      b.fulfillment,
      ["pickup", "delivery"],
      "fulfillment method",
    );
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const { discount, promo } = promotion(b.promo_code, subtotal);
    const delivery_fee = fulfillment === "delivery" ? deliveryFee : 0;
    return {
      items,
      fulfillment,
      subtotal,
      discount,
      promo,
      delivery_fee,
      total: subtotal - discount + delivery_fee,
    };
  }
  function reports(from, to) {
    date(from);
    date(to);
    if (from > to) fail(400, "The start date must come before the end date.");
    const end = to + "T23:59:59.999Z";
    const receipts = db
      .prepare(
        "SELECT COALESCE(SUM(amount),0) value FROM payments WHERE created_at>=? AND created_at<=?",
      )
      .get(from, end).value;
    const expenses = db
      .prepare(
        "SELECT COALESCE(SUM(amount),0) value FROM expenses WHERE date>=? AND date<=?",
      )
      .get(from, to).value;
    const sales = db
      .prepare(
        "SELECT COALESCE(SUM(total),0) value FROM orders WHERE status!='cancelled' AND created_at>=? AND created_at<=?",
      )
      .get(from, end).value;
    const outstanding = db
      .prepare(
        "SELECT COALESCE(SUM(o.total-COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id=o.id),0)),0) value FROM orders o WHERE o.status!='cancelled'",
      )
      .get().value;
    const daily = db
      .prepare(
        "SELECT substr(created_at,1,10) day,SUM(total) total,COUNT(*) orders FROM orders WHERE status!='cancelled' AND created_at>=? AND created_at<=? GROUP BY day ORDER BY day",
      )
      .all(from, end);
    const top = db
      .prepare(
        "SELECT i.name,SUM(i.quantity) quantity,SUM(i.price*i.quantity) total FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.status!='cancelled' AND o.created_at>=? AND o.created_at<=? GROUP BY i.product_id ORDER BY total DESC LIMIT 5",
      )
      .all(from, end);
    return {
      from,
      to,
      receipts,
      expenses,
      cash_surplus: receipts - expenses,
      sales,
      outstanding,
      daily,
      top,
    };
  }
  async function api(req, res, path, url, user, b) {
    const method = req.method,
      ip = clientIp(req);
    if (method === "GET" && path === "/api/config")
      return {
        demo,
        brand: "REAP Market",
        currency: "USD",
        delivery_fee: deliveryFee,
        categories,
        units,
        pickup_address:
          "REAP, Children Home, Bentol City, Montserrado County, Liberia",
        delivery_area: process.env.DELIVERY_AREA || "Bentol City and Monrovia",
        support_whatsapp: process.env.SUPPORT_WHATSAPP || "",
        support_email: process.env.SUPPORT_EMAIL || "",
      };
    if (method === "GET" && path === "/api/session")
      return { user: publicUser(user), csrf: user?.csrf || null };
    if (method === "GET" && path === "/api/products")
      return db
        .prepare(
          "SELECT * FROM products WHERE active=1 ORDER BY featured DESC,name",
        )
        .all();
    if (method === "POST" && path === "/api/auth/demo") {
      if (!demo) fail(404, "Not found.");
      limit("auth:" + ip, 15, 60000);
      const role = choice(
        b.role,
        ["admin", "sales", "dispatch", "accountant", "customer"],
        "role",
      );
      return newSession(
        res,
        db
          .prepare("SELECT * FROM users WHERE id=?")
          .get(
            role === "admin"
              ? "demo-admin"
              : role === "sales"
                ? "demo-sales"
                : role === "dispatch"
                  ? "demo-dispatch"
                  : role === "accountant"
                    ? "demo-finance"
                    : "demo-customer",
          ),
      );
    }
    if (method === "POST" && path === "/api/auth/login") {
      limit("auth:" + ip, 10, 15 * 60000);
      const address = email(b.email);
      limit("login:" + address, 10, 15 * 60000);
      const password = passwordInput(b.password);
      const u = db
        .prepare(
          "SELECT * FROM users WHERE email=? COLLATE NOCASE AND active=1",
        )
        .get(address);
      // Derive even for missing users to reduce account enumeration by response timing.
      const stored =
        u?.password || "00000000000000000000000000000000:" + "00".repeat(64);
      if (!(await verifyPassword(password, stored)) || !u)
        fail(401, "Email or password is incorrect.");
      audit(u, "sign_in", u.id);
      return newSession(res, u);
    }
    if (method === "POST" && path === "/api/auth/register") {
      limit("register:" + ip, 5, 3600000);
      const address = email(b.email),
        name = str(b.name, "Name", 100),
        password = await hashPassword(b.password);
      if (
        db
          .prepare("SELECT id FROM users WHERE email=? COLLATE NOCASE")
          .get(address)
      )
        fail(409, "Unable to create this account. Try signing in.");
      const u = { id: id("usr_"), name, email: address, role: "customer" };
      db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?,?)").run(
        u.id,
        name,
        address,
        password,
        u.role,
        1,
        now(),
      );
      audit(u, "account_created", u.id);
      return newSession(res, u);
    }
    if (method === "POST" && path === "/api/auth/logout") {
      if (user)
        db.prepare("DELETE FROM sessions WHERE token=?").run(user.token);
      res.setHeader(
        "Set-Cookie",
        `reap_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${production ? "; Secure" : ""}`,
      );
      return { ok: true };
    }
    if (method === "POST" && path === "/api/auth/password") {
      if (!user) fail(401, "Sign in first.");
      limit("password:" + ip, 5, 3600000);
      if (
        !(await verifyPassword(
          passwordInput(b.current_password),
          user.password,
        ))
      )
        fail(400, "The current password is incorrect.");
      const password = await hashPassword(b.new_password);
      tx(() => {
        db.prepare("UPDATE users SET password=? WHERE id=?").run(
          password,
          user.id,
        );
        db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
        audit(user, "password_changed", user.id);
      });
      return newSession(res, user);
    }
    if (method === "POST" && path === "/api/quote") {
      limit("quote:" + ip, 60);
      const q = quote(b);
      return {
        subtotal: q.subtotal,
        discount: q.discount,
        delivery_fee: q.delivery_fee,
        total: q.total,
      };
    }
    if (method === "POST" && path === "/api/orders") {
      limit("order:" + ip, 20, 3600000);
      const key = str(b.idempotency_key, "Request identifier", 100, 16);
      const existing = db
        .prepare("SELECT id FROM orders WHERE idempotency_key=?")
        .get(key);
      if (existing)
        fail(
          409,
          "This order was already submitted. Check your confirmation or order history.",
        );
      const name = str(b.name, "Name", 100),
        addressEmail = user?.role === "customer" ? user.email : email(b.email),
        phone = str(b.phone, "Phone", 30, 7);
      if (!/^[+()\d\s-]{7,30}$/.test(phone))
        fail(400, "Enter a valid phone number.");
      const preferred_date = date(b.preferred_date, "Preferred date");
      const today = now().slice(0, 10);
      if (
        preferred_date < today ||
        preferred_date >
          new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
      )
        fail(400, "Choose a date within the next 90 days.");
      const notes = str(b.notes || "", "Order notes", 1000, 0);
      const rawToken = token(),
        oid = id("ord_");
      const result = tx(() => {
        const q = quote(b);
        const address =
          q.fulfillment === "delivery"
            ? str(b.address, "Delivery address", 500, 10)
            : "REAP, Children Home, Bentol City";
        const payment_method = choice(
          b.payment_method,
          ["cash", "mobile_money", "bank_transfer"],
          "payment method",
        );
        let c = db
          .prepare("SELECT * FROM customers WHERE email=? COLLATE NOCASE")
          .get(addressEmail);
        if (!c) {
          c = { id: id("cus_") };
          db.prepare("INSERT INTO customers VALUES(?,?,?,?,?,?)").run(
            c.id,
            name,
            addressEmail,
            phone,
            b.marketing_opt_in === true ? 1 : 0,
            now(),
          );
        }
        // Guest orders cannot change an existing customer's consent or contact details.
        const count = db.prepare("SELECT COUNT(*) n FROM orders").get().n;
        const number = "REAP-" + String(1100 + Number(count));
        const stamp = now();
        db.prepare(
          `INSERT INTO orders(id,number,customer_id,user_id,name,email,phone,fulfillment,address,preferred_date,notes,status,subtotal,discount,delivery_fee,total,promo_id,tracking_hash,idempotency_key,payment_method,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        ).run(
          oid,
          number,
          c.id,
          user?.role === "customer" ? user.id : null,
          name,
          addressEmail,
          phone,
          q.fulfillment,
          address,
          preferred_date,
          notes,
          "received",
          q.subtotal,
          q.discount,
          q.delivery_fee,
          q.total,
          q.promo?.id || null,
          digest(rawToken),
          key,
          payment_method,
          stamp,
          stamp,
        );
        for (const p of q.items) {
          const updated = db
            .prepare(
              "UPDATE products SET stock=stock-? WHERE id=? AND stock>=?",
            )
            .run(p.quantity, p.id, p.quantity);
          if (updated.changes !== 1)
            fail(409, "Stock changed. Please refresh your basket.");
          db.prepare(
            "INSERT INTO order_items(order_id,product_id,name,unit,price,quantity) VALUES(?,?,?,?,?,?)",
          ).run(oid, p.id, p.name, p.unit, p.price, p.quantity);
          db.prepare("INSERT INTO inventory_movements VALUES(?,?,?,?,?,?)").run(
            id(),
            p.id,
            -p.quantity,
            `Reserved for ${number}`,
            user?.id || null,
            stamp,
          );
        }
        if (q.promo)
          db.prepare("UPDATE promotions SET uses=uses+1 WHERE id=?").run(
            q.promo.id,
          );
        db.prepare(
          "INSERT INTO order_events(order_id,status,created_at) VALUES(?,?,?)",
        ).run(oid, "received", stamp);
        audit(user, "order_created", oid, number);
        return orderView(
          db.prepare("SELECT * FROM orders WHERE id=?").get(oid),
        );
      });
      return { ...result, tracking_token: rawToken };
    }
    if (method === "POST" && path === "/api/track") {
      limit("track:" + ip, 15, 60000);
      const raw = str(b.token, "Tracking code", 64, 64);
      const o = db
        .prepare("SELECT * FROM orders WHERE tracking_hash=?")
        .get(digest(raw));
      if (!o) fail(404, "No order matched this tracking code.");
      return orderView(o);
    }
    if (method === "GET" && path === "/api/my/orders") {
      if (!user) fail(401, "Sign in to see your orders.");
      return db
        .prepare(
          "SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 200",
        )
        .all(user.id)
        .map(orderView);
    }
    if (path === "/api/my/messages") {
      if (!user || user.role !== "customer")
        fail(401, "Sign in to your customer account.");
      if (method === "GET")
        return db
          .prepare(
            "SELECT * FROM conversations WHERE user_id=? ORDER BY created_at LIMIT 500",
          )
          .all(user.id);
      if (method === "POST") {
        limit("message:" + user.id, 10, 60000);
        db.prepare("INSERT INTO conversations VALUES(?,?,?,?,?)").run(
          id(),
          user.id,
          str(b.body, "Message", 2000),
          0,
          now(),
        );
        return { ok: true };
      }
    }
    if (path.startsWith("/api/admin/")) {
      if (!user || user.role === "customer")
        fail(403, "Staff access is required.");
      if (method === "GET" && path === "/api/admin/bootstrap") {
        const scopes = roles[user.role],
          has = (s) => scopes.includes(s);
        const allOrders = getOrders();
        const orders =
          has("orders") || has("finance")
            ? allOrders
            : has("deliveries")
              ? allOrders.filter(
                  (o) =>
                    o.fulfillment === "delivery" &&
                    !["cancelled", "completed"].includes(o.status),
                )
              : [];
        const customers = has("customers")
          ? db
              .prepare(
                "SELECT c.*,COUNT(o.id) order_count,COALESCE(SUM(CASE WHEN o.status!='cancelled' THEN o.total ELSE 0 END),0) lifetime_value FROM customers c LEFT JOIN orders o ON c.id=o.customer_id GROUP BY c.id ORDER BY c.created_at DESC LIMIT 1000",
              )
              .all()
          : [];
        return {
          products:
            has("products") || has("inventory")
              ? db.prepare("SELECT * FROM products ORDER BY name").all()
              : [],
          orders,
          customers,
          expenses: has("finance")
            ? db
                .prepare("SELECT * FROM expenses ORDER BY date DESC LIMIT 1000")
                .all()
            : [],
          payments: has("finance")
            ? db
                .prepare(
                  "SELECT p.*,o.number FROM payments p JOIN orders o ON p.order_id=o.id ORDER BY p.created_at DESC LIMIT 1000",
                )
                .all()
            : [],
          campaigns: has("marketing")
            ? db
                .prepare("SELECT * FROM campaigns ORDER BY created_at DESC")
                .all()
            : [],
          promotions: has("marketing")
            ? db.prepare("SELECT * FROM promotions").all()
            : [],
          messages: has("messages")
            ? db
                .prepare(
                  "SELECT m.*,c.name customer_name,c.email,c.phone FROM messages m JOIN customers c ON m.customer_id=c.id ORDER BY m.created_at DESC LIMIT 500",
                )
                .all()
            : [],
          conversations: has("messages")
            ? db
                .prepare(
                  "SELECT c.*,u.name FROM conversations c JOIN users u ON c.user_id=u.id ORDER BY c.created_at LIMIT 1000",
                )
                .all()
            : [],
          team: has("team")
            ? db
                .prepare(
                  "SELECT id,name,email,role,active,created_at FROM users WHERE role!='customer'",
                )
                .all()
            : [],
          drivers: has("deliveries")
            ? db
                .prepare(
                  "SELECT id,name FROM users WHERE role='dispatch' AND active=1",
                )
                .all()
            : [],
          audit: has("settings")
            ? db
                .prepare(
                  "SELECT a.*,u.name actor_name FROM audit a LEFT JOIN users u ON a.actor=u.id ORDER BY a.id DESC LIMIT 80",
                )
                .all()
            : [],
          movements: has("inventory")
            ? db
                .prepare(
                  "SELECT m.*,p.name product_name FROM inventory_movements m JOIN products p ON p.id=m.product_id ORDER BY m.created_at DESC LIMIT 200",
                )
                .all()
            : [],
          reports:
            has("reports") || has("finance")
              ? reports(
                  new Date(Date.now() - 29 * 86400000)
                    .toISOString()
                    .slice(0, 10),
                  now().slice(0, 10),
                )
              : null,
          integrations:
            has("settings") || has("messages") ? providerStatus(demo) : null,
          summary: {
            orders: orders.length,
            open: orders.filter(
              (o) => !["completed", "cancelled"].includes(o.status),
            ).length,
            customers: customers.length,
            low_stock: has("inventory")
              ? db
                  .prepare(
                    "SELECT COUNT(*) n FROM products WHERE active=1 AND stock<=threshold",
                  )
                  .get().n
              : 0,
          },
        };
      }
      if (path === "/api/admin/products" && method === "POST") {
        permit(user, "products");
        const pid = b.id ? str(b.id, "Product id", 80) : id("prd_");
        const name = str(b.name, "Product name", 120),
          category = choice(b.category, categories, "category"),
          description = str(b.description, "Description", 2000),
          price = integer(b.price, "Price in cents", 1),
          unit = choice(b.unit, units, "unit"),
          threshold = integer(b.threshold, "Low stock threshold", 0, 100000);
        const image = str(b.image, "Image path", 300);
        if (!/^\/assets\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp|svg)$/.test(image))
          fail(400, "Choose a local catalogue image.");
        tx(() => {
          if (b.id) {
            if (!db.prepare("SELECT id FROM products WHERE id=?").get(pid))
              fail(404, "Product not found.");
            db.prepare(
              "UPDATE products SET name=?,category=?,description=?,price=?,unit=?,threshold=?,image=?,active=?,featured=? WHERE id=?",
            ).run(
              name,
              category,
              description,
              price,
              unit,
              threshold,
              image,
              b.active ? 1 : 0,
              b.featured ? 1 : 0,
              pid,
            );
          } else {
            const stock = integer(b.stock, "Starting stock", 0, 100000);
            db.prepare(
              "INSERT INTO products VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            ).run(
              pid,
              name,
              category,
              description,
              price,
              unit,
              stock,
              threshold,
              image,
              b.active ? 1 : 0,
              b.featured ? 1 : 0,
              now(),
            );
            db.prepare(
              "INSERT INTO inventory_movements VALUES(?,?,?,?,?,?)",
            ).run(id(), pid, stock, "Opening stock", user.id, now());
          }
          audit(user, b.id ? "product_updated" : "product_created", pid);
        });
        return { id: pid };
      }
      if (path === "/api/admin/inventory" && method === "POST") {
        permit(user, "inventory");
        const pid = str(b.product_id, "Product", 80),
          delta = integer(b.delta, "Stock adjustment", -100000, 100000),
          reason = str(b.reason, "Reason", 500, 3);
        if (delta === 0) fail(400, "The adjustment cannot be zero.");
        tx(() => {
          const p = db.prepare("SELECT * FROM products WHERE id=?").get(pid);
          if (!p) fail(404, "Product not found.");
          if (p.stock + delta < 0) fail(409, "Stock cannot be negative.");
          db.prepare("UPDATE products SET stock=stock+? WHERE id=?").run(
            delta,
            pid,
          );
          db.prepare("INSERT INTO inventory_movements VALUES(?,?,?,?,?,?)").run(
            id(),
            pid,
            delta,
            reason,
            user.id,
            now(),
          );
          audit(user, "stock_adjusted", pid, `${delta}: ${reason}`);
        });
        return { ok: true };
      }
      if (path === "/api/admin/order-status" && method === "POST") {
        permit(user, user.role === "dispatch" ? "deliveries" : "orders");
        const status = choice(b.status, statuses, "order status");
        tx(() => {
          const o = db
            .prepare("SELECT * FROM orders WHERE id=?")
            .get(str(b.order_id, "Order", 80));
          if (!o) fail(404, "Order not found.");
          const allowed = {
            received: ["confirmed", "cancelled"],
            confirmed: ["preparing", "cancelled"],
            preparing: ["ready", "cancelled"],
            ready:
              o.fulfillment === "delivery"
                ? ["out_for_delivery", "cancelled"]
                : ["completed", "cancelled"],
            out_for_delivery: ["completed"],
            completed: [],
            cancelled: [],
          };
          if (!allowed[o.status]?.includes(status))
            fail(409, "This status change is not allowed.");
          if (
            user.role === "dispatch" &&
            (o.fulfillment !== "delivery" ||
              !["out_for_delivery", "completed"].includes(status))
          )
            fail(
              403,
              "Delivery staff can dispatch and complete ready deliveries.",
            );
          if (status === "cancelled") {
            if (paid(o.id) > 0)
              fail(
                409,
                "Record the customer refund before cancelling this paid order.",
              );
            for (const i of db
              .prepare("SELECT * FROM order_items WHERE order_id=?")
              .all(o.id)) {
              db.prepare("UPDATE products SET stock=stock+? WHERE id=?").run(
                i.quantity,
                i.product_id,
              );
              db.prepare(
                "INSERT INTO inventory_movements VALUES(?,?,?,?,?,?)",
              ).run(
                id(),
                i.product_id,
                i.quantity,
                `Cancelled ${o.number}`,
                user.id,
                now(),
              );
            }
            if (o.promo_id)
              db.prepare(
                "UPDATE promotions SET uses=MAX(uses-1,0) WHERE id=?",
              ).run(o.promo_id);
          }
          db.prepare("UPDATE orders SET status=?,updated_at=? WHERE id=?").run(
            status,
            now(),
            o.id,
          );
          db.prepare(
            "INSERT INTO order_events(order_id,status,created_at) VALUES(?,?,?)",
          ).run(o.id, status, now());
          audit(user, "order_status", o.id, `${o.status} → ${status}`);
        });
        return { ok: true };
      }
      if (path === "/api/admin/assign-driver" && method === "POST") {
        permit(user, "deliveries");
        const driver = str(b.driver_id, "Driver", 80);
        if (
          !db
            .prepare(
              "SELECT id FROM users WHERE id=? AND role='dispatch' AND active=1",
            )
            .get(driver)
        )
          fail(400, "Choose an active delivery team member.");
        const o = db
          .prepare(
            "SELECT id FROM orders WHERE id=? AND fulfillment='delivery'",
          )
          .get(str(b.order_id, "Order", 80));
        if (!o) fail(404, "Delivery not found.");
        db.prepare("UPDATE orders SET driver_id=?,updated_at=? WHERE id=?").run(
          driver,
          now(),
          o.id,
        );
        audit(user, "driver_assigned", o.id, driver);
        return { ok: true };
      }
      if (path === "/api/admin/payments" && method === "POST") {
        permit(user, "finance");
        const amount = integer(
          b.amount,
          "Amount in cents",
          -100000000,
          100000000,
        );
        if (!amount) fail(400, "Enter a nonzero amount.");
        const method = choice(
            b.method,
            ["cash", "mobile_money", "bank_transfer"],
            "payment method",
          ),
          reference = str(b.reference, "Receipt or transfer reference", 200, 3);
        tx(() => {
          const o = db
            .prepare("SELECT * FROM orders WHERE id=?")
            .get(str(b.order_id, "Order", 80));
          if (!o) fail(404, "Order not found.");
          if (o.status === "cancelled")
            fail(409, "Cannot record payments on a cancelled order.");
          const balance = paid(o.id) + amount;
          if (balance < 0 || balance > o.total)
            fail(
              409,
              "Amount exceeds the outstanding balance or refundable amount.",
            );
          db.prepare("INSERT INTO payments VALUES(?,?,?,?,?,?,?)").run(
            id("pay_"),
            o.id,
            amount,
            method,
            reference,
            user.id,
            now(),
          );
          audit(
            user,
            amount > 0 ? "payment_recorded" : "refund_recorded",
            o.id,
            amount,
          );
        });
        return { ok: true };
      }
      if (path === "/api/admin/expenses" && method === "POST") {
        permit(user, "finance");
        const eid = id("exp_");
        db.prepare("INSERT INTO expenses VALUES(?,?,?,?,?,?,?)").run(
          eid,
          choice(
            b.category,
            [
              "Feed",
              "Transport",
              "Supplies",
              "Utilities",
              "Wages",
              "Marketing",
              "Other",
            ],
            "expense category",
          ),
          str(b.description, "Description", 500),
          integer(b.amount, "Amount in cents", 1),
          date(b.date),
          user.id,
          now(),
        );
        audit(user, "expense_recorded", eid, b.amount);
        return { ok: true };
      }
      if (path === "/api/admin/customer" && method === "POST") {
        permit(user, "customers");
        const c = db
          .prepare("SELECT * FROM customers WHERE id=?")
          .get(str(b.id, "Customer", 80));
        if (!c) fail(404, "Customer not found.");
        db.prepare(
          "UPDATE customers SET name=?,phone=?,marketing_opt_in=? WHERE id=?",
        ).run(
          str(b.name, "Name", 100),
          str(b.phone, "Phone", 30),
          b.marketing_opt_in ? 1 : 0,
          c.id,
        );
        audit(user, "customer_updated", c.id);
        return { ok: true };
      }
      if (path === "/api/admin/promotions" && method === "POST") {
        permit(user, "marketing");
        const code = str(b.code, "Code", 30, 3).toUpperCase();
        if (!/^[A-Z0-9_-]+$/.test(code))
          fail(
            400,
            "Use letters, numbers, underscores or hyphens for the code.",
          );
        if (db.prepare("SELECT id FROM promotions WHERE code=?").get(code))
          fail(409, "This code already exists.");
        db.prepare("INSERT INTO promotions VALUES(?,?,?,?,?,?,?)").run(
          id(),
          code,
          integer(b.percent, "Discount percent", 1, 80),
          integer(b.max_uses, "Maximum uses", 1, 100000),
          0,
          date(b.expires),
          1,
        );
        audit(user, "promotion_created", code);
        return { ok: true };
      }
      if (path === "/api/admin/promotion-toggle" && method === "POST") {
        permit(user, "marketing");
        db.prepare("UPDATE promotions SET active=? WHERE id=?").run(
          b.active ? 1 : 0,
          str(b.id, "Promotion", 80),
        );
        audit(user, "promotion_toggled", b.id);
        return { ok: true };
      }
      if (path === "/api/admin/campaigns" && method === "POST") {
        permit(user, "marketing");
        const cid = b.id ? str(b.id, "Campaign", 80) : id();
        const values = [
          str(b.name, "Campaign name", 150),
          choice(
            b.channel,
            ["WhatsApp", "Facebook", "Instagram", "Email", "SMS"],
            "channel",
          ),
          str(b.content, "Campaign content", 3000),
          choice(
            b.status,
            ["draft", "planned", "published", "completed"],
            "campaign status",
          ),
          integer(b.budget, "Budget in cents"),
          integer(b.spent || 0, "Spend in cents"),
          integer(b.impressions || 0, "Impressions"),
          integer(b.clicks || 0, "Clicks"),
          date(b.start_date),
        ];
        if (b.id) {
          if (!db.prepare("SELECT id FROM campaigns WHERE id=?").get(cid))
            fail(404, "Campaign not found.");
          db.prepare(
            "UPDATE campaigns SET name=?,channel=?,content=?,status=?,budget=?,spent=?,impressions=?,clicks=?,start_date=? WHERE id=?",
          ).run(...values, cid);
        } else
          db.prepare("INSERT INTO campaigns VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(
            cid,
            ...values,
            now(),
          );
        audit(user, "campaign_saved", cid);
        return { ok: true };
      }
      if (path === "/api/admin/messages" && method === "POST") {
        permit(user, "messages");
        const c = db
          .prepare("SELECT * FROM customers WHERE id=?")
          .get(str(b.customer_id, "Customer", 80));
        if (!c) fail(404, "Customer not found.");
        const purpose = choice(
          b.purpose,
          ["transactional", "marketing"],
          "message purpose",
        );
        if (purpose === "marketing" && !c.marketing_opt_in)
          fail(400, "This customer has not opted in to marketing.");
        const mid = id("msg_");
        db.prepare(
          "INSERT INTO messages(id,customer_id,channel,subject,body,purpose,status,actor,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
        ).run(
          mid,
          c.id,
          choice(b.channel, ["email", "sms", "whatsapp"], "channel"),
          str(b.subject, "Subject", 200),
          str(b.body, "Message", 3000),
          purpose,
          "draft",
          user.id,
          now(),
        );
        audit(user, "message_drafted", mid);
        return { ok: true };
      }
      if (path === "/api/admin/send-message" && method === "POST") {
        permit(user, "messages");
        if (demo)
          fail(409, "Outbound messaging is disabled in the demonstration.");
        const mid = str(b.id, "Message", 80);
        let msg = db
          .prepare(
            "SELECT m.*,c.email,c.phone,c.marketing_opt_in FROM messages m JOIN customers c ON c.id=m.customer_id WHERE m.id=?",
          )
          .get(mid);
        if (!msg || msg.status !== "draft")
          fail(409, "Only unsent drafts can be sent.");
        const providers = providerStatus(demo);
        if (!providers.enabled || !providers[msg.channel])
          fail(
            409,
            "Connect and enable the messaging provider before sending.",
          );
        if (msg.purpose === "marketing" && !msg.marketing_opt_in)
          fail(400, "Marketing consent has been withdrawn.");
        db.prepare(
          "UPDATE messages SET status='sending' WHERE id=? AND status='draft'",
        ).run(mid);
        try {
          const providerId = await sendMessage(msg);
          db.prepare(
            "UPDATE messages SET status='accepted',provider_id=? WHERE id=?",
          ).run(providerId, mid);
          audit(user, "message_accepted_by_provider", mid);
          return { ok: true };
        } catch (e) {
          db.prepare(
            "UPDATE messages SET status='review_required' WHERE id=?",
          ).run(mid);
          audit(user, "message_delivery_uncertain", mid);
          fail(
            502,
            "The provider did not confirm acceptance. Check the provider before attempting another message.",
          );
        }
      }
      if (path === "/api/admin/reply" && method === "POST") {
        permit(user, "messages");
        const uid = str(b.user_id, "Customer", 80);
        if (
          !db
            .prepare("SELECT id FROM users WHERE id=? AND role='customer'")
            .get(uid)
        )
          fail(404, "Customer not found.");
        db.prepare("INSERT INTO conversations VALUES(?,?,?,?,?)").run(
          id(),
          uid,
          str(b.body, "Message", 2000),
          1,
          now(),
        );
        audit(user, "inbox_reply", uid);
        return { ok: true };
      }
      if (path === "/api/admin/team" && method === "POST") {
        permit(user, "team");
        const address = email(b.email);
        if (
          db
            .prepare("SELECT id FROM users WHERE email=? COLLATE NOCASE")
            .get(address)
        )
          fail(409, "An account already uses this email.");
        const uid = id("usr_"),
          role = choice(
            b.role,
            ["admin", "manager", "sales", "dispatch", "accountant"],
            "staff role",
          );
        db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?,?)").run(
          uid,
          str(b.name, "Name", 100),
          address,
          await hashPassword(b.password),
          role,
          1,
          now(),
        );
        audit(user, "staff_created", uid, role);
        return { ok: true };
      }
      if (path === "/api/admin/team-access" && method === "POST") {
        permit(user, "team");
        const uid = str(b.id, "Staff member", 80);
        if (uid === user.id)
          fail(400, "You cannot change your own access here.");
        const target = db
          .prepare("SELECT * FROM users WHERE id=? AND role!='customer'")
          .get(uid);
        if (!target) fail(404, "Staff member not found.");
        const role = choice(
          b.role,
          ["admin", "manager", "sales", "dispatch", "accountant"],
          "staff role",
        );
        tx(() => {
          db.prepare("UPDATE users SET active=?,role=? WHERE id=?").run(
            b.active ? 1 : 0,
            role,
            uid,
          );
          db.prepare("DELETE FROM sessions WHERE user_id=?").run(uid);
          audit(user, "staff_access_changed", uid, role);
        });
        return { ok: true };
      }
      if (method === "GET" && path === "/api/admin/reports") {
        permit(user, "reports");
        return reports(
          url.searchParams.get("from"),
          url.searchParams.get("to"),
        );
      }
      if (method === "GET" && path === "/api/admin/export") {
        const kind = url.searchParams.get("type");
        let rows;
        if (kind === "customers") {
          permit(user, "customers");
          rows = [
            ["Name", "Email", "Phone", "Marketing consent"],
            ...db
              .prepare("SELECT * FROM customers")
              .all()
              .map((c) => [
                c.name,
                c.email,
                c.phone,
                c.marketing_opt_in ? "Yes" : "No",
              ]),
          ];
        } else if (kind === "inventory") {
          permit(user, "inventory");
          rows = [
            [
              "Product",
              "Category",
              "Unit",
              "Stock",
              "Low stock threshold",
              "Unit price USD",
            ],
            ...db
              .prepare("SELECT * FROM products")
              .all()
              .map((p) => [
                p.name,
                p.category,
                p.unit,
                p.stock,
                p.threshold,
                (p.price / 100).toFixed(2),
              ]),
          ];
        } else if (kind === "bookkeeping") {
          permit(user, "finance");
          rows = [
            ["Date", "Type", "Reference", "Amount USD"],
            ...db
              .prepare(
                "SELECT p.*,o.number FROM payments p JOIN orders o ON o.id=p.order_id",
              )
              .all()
              .map((p) => [
                p.created_at,
                p.amount > 0 ? "Receipt" : "Refund",
                p.number + " " + p.reference,
                (p.amount / 100).toFixed(2),
              ]),
            ...db
              .prepare("SELECT * FROM expenses")
              .all()
              .map((e) => [
                e.date,
                "Expense",
                e.description,
                (-e.amount / 100).toFixed(2),
              ]),
          ];
        } else {
          permit(user, "orders");
          rows = [
            [
              "Order",
              "Date",
              "Customer",
              "Status",
              "Fulfillment",
              "Total USD",
              "Paid USD",
            ],
            ...getOrders().map((o) => [
              o.number,
              o.created_at,
              o.name,
              o.status,
              o.fulfillment,
              (o.total / 100).toFixed(2),
              (o.paid / 100).toFixed(2),
            ]),
          ];
        }
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="reap-${["customers", "inventory", "bookkeeping"].includes(kind) ? kind : "orders"}.csv"`,
        );
        res.end(csv(rows));
        return undefined;
      }
    }
    fail(404, "This endpoint was not found.");
  }
  const server = createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    if (production)
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
      );
    try {
      const url = new URL(req.url, "http://localhost"),
        path = url.pathname;
      if (path === "/health") {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }
      if (path.startsWith("/api/")) {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        limit("all:" + clientIp(req), 300, 60000);
        const user = sessionFor(req);
        if (!["GET", "POST"].includes(req.method))
          fail(405, "Method not allowed.");
        let b = {};
        if (req.method === "POST") {
          const allowedOrigin = origin || `http://${req.headers.host}`;
          if (req.headers.origin && req.headers.origin !== allowedOrigin)
            fail(403, "Cross-origin requests are not allowed.");
          if (req.headers["sec-fetch-site"] === "cross-site")
            fail(403, "Cross-site request rejected.");
          if (user && req.headers["x-csrf-token"] !== user.csrf)
            fail(403, "Your session changed. Refresh the page and try again.");
          b = await body(req);
        }
        const result = await api(req, res, path, url, user, b);
        if (!res.writableEnded) res.end(JSON.stringify(result));
        return;
      }
      if (!["GET", "HEAD"].includes(req.method))
        fail(405, "Method not allowed.");
      let pathname;
      try {
        pathname = decodeURIComponent(path);
      } catch {
        fail(400, "Invalid path.");
      }
      let file = resolve(root, "." + pathname);
      if (!file.startsWith(root + sep) && file !== root)
        fail(403, "Forbidden path.");
      if (!existsSync(file) || !statSync(file).isFile()) {
        if (extname(pathname)) fail(404, "Asset not found.");
        file = resolve(root, "index.html");
      }
      if (!existsSync(file))
        fail(503, "Build the frontend with npm run build first.");
      res.setHeader(
        "Content-Type",
        MIME[extname(file)] || "application/octet-stream",
      );
      res.setHeader(
        "Cache-Control",
        file.endsWith(".html") ? "no-cache" : "public, max-age=3600",
      );
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      createReadStream(file).pipe(res);
    } catch (e) {
      if (res.writableEnded) return;
      const status = e.status || 500;
      if (status === 500) console.error("Request failed:", e.message);
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          error:
            status === 500
              ? "Something went wrong. Please try again."
              : e.message,
        }),
      );
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return {
    server,
    db,
    close: () =>
      new Promise((resolve) =>
        server.close(() => {
          db.close();
          resolve();
        }),
      ),
  };
}
