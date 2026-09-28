import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";

export const id = (prefix = "") => prefix + randomBytes(12).toString("hex");
export const now = () => new Date().toISOString();
export function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 67108864 }).toString("hex")}`;
}
export function openDatabase(filename, demo = false) {
  mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','manager','sales','dispatch','accountant','customer')),
      active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      phone TEXT NOT NULL, marketing_opt_in INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL,
      price INTEGER NOT NULL CHECK(price>=0), unit TEXT NOT NULL,
      stock INTEGER NOT NULL CHECK(stock>=0), threshold INTEGER NOT NULL DEFAULT 10,
      image TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS promotions (
      id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE COLLATE NOCASE, percent INTEGER NOT NULL CHECK(percent BETWEEN 1 AND 80),
      max_uses INTEGER NOT NULL CHECK(max_uses>0), uses INTEGER NOT NULL DEFAULT 0,
      expires TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, number TEXT UNIQUE NOT NULL, customer_id TEXT NOT NULL REFERENCES customers(id),
      user_id TEXT REFERENCES users(id), name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
      fulfillment TEXT NOT NULL CHECK(fulfillment IN ('delivery','pickup')), address TEXT NOT NULL,
      preferred_date TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'received', subtotal INTEGER NOT NULL,
      discount INTEGER NOT NULL DEFAULT 0, delivery_fee INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL CHECK(total>=0), promo_id TEXT REFERENCES promotions(id),
      tracking_hash TEXT UNIQUE NOT NULL, idempotency_key TEXT UNIQUE NOT NULL,
      driver_id TEXT REFERENCES users(id), payment_method TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), product_id TEXT NOT NULL REFERENCES products(id),
      name TEXT NOT NULL, unit TEXT NOT NULL, price INTEGER NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0)
    );
    CREATE TABLE IF NOT EXISTS order_events (id INTEGER PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), status TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), amount INTEGER NOT NULL CHECK(amount!=0),
      method TEXT NOT NULL, reference TEXT NOT NULL, actor TEXT REFERENCES users(id), created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, category TEXT NOT NULL, description TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount>0), date TEXT NOT NULL, actor TEXT REFERENCES users(id), created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS inventory_movements (id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id), delta INTEGER NOT NULL, reason TEXT NOT NULL, actor TEXT REFERENCES users(id), created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, channel TEXT NOT NULL, content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', budget INTEGER NOT NULL, spent INTEGER NOT NULL DEFAULT 0, impressions INTEGER NOT NULL DEFAULT 0, clicks INTEGER NOT NULL DEFAULT 0, start_date TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, customer_id TEXT REFERENCES customers(id), channel TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, purpose TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', provider_id TEXT, actor TEXT REFERENCES users(id), created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), body TEXT NOT NULL, from_staff INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, actor TEXT, action TEXT NOT NULL, target TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);
    CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at);
    CREATE INDEX IF NOT EXISTS items_order_idx ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS payments_order_idx ON payments(order_id);
    CREATE INDEX IF NOT EXISTS conversation_user_idx ON conversations(user_id);
  `);
  const mode = db.prepare("SELECT value FROM meta WHERE key=?").get("mode");
  if (mode && mode.value !== (demo ? "demo" : "live"))
    throw new Error(
      "Use separate databases for demonstration and live operation.",
    );
  db.prepare("INSERT OR IGNORE INTO meta VALUES (?,?)").run(
    "mode",
    demo ? "demo" : "live",
  );
  if (demo && !db.prepare("SELECT id FROM users LIMIT 1").get()) seedDemo(db);
  return db;
}

function seedDemo(db) {
  const stamp = now();
  const names = [
    ["demo-admin", "Market administrator", "admin"],
    ["demo-sales", "Sales team", "sales"],
    ["demo-dispatch", "Delivery team", "dispatch"],
    ["demo-finance", "Accounts team", "accountant"],
    ["demo-customer", "Demo customer", "customer"],
  ];
  const inaccessiblePassword = passwordHash(randomBytes(32).toString("hex"));
  for (const [uid, name, role] of names)
    db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?)").run(
      uid,
      name,
      `${role}@example.test`,
      inaccessiblePassword,
      role,
      1,
      stamp,
    );
  const products = [
    [
      "pork",
      "Fresh pork cuts",
      "Pork & livestock",
      "Freshly prepared pork, sold by the pound. Tell our team your preferred cuts in your order notes.",
      450,
      "lb",
      185,
      30,
      "/assets/pork.jpg",
      1,
    ],
    [
      "tilapia",
      "Live tilapia",
      "Fish & aquaculture",
      "Live freshwater tilapia, sold by the pound. Our team will confirm harvest and collection arrangements.",
      350,
      "lb",
      120,
      20,
      "/assets/fish.jpg",
      1,
    ],
    [
      "lettuce",
      "Aquaponic lettuce",
      "Aquaponics",
      "Crisp leafy lettuce grown in an aquaponic system. A fresh addition to salads and everyday meals.",
      200,
      "bunch",
      42,
      12,
      "/assets/lettuce.jpg",
      1,
    ],
    [
      "pig",
      "Farm-raised live pig",
      "Pork & livestock",
      "Order a live pig by the head. The team will confirm available animals, size and handling arrangements.",
      18500,
      "head",
      8,
      3,
      "/assets/pig.jpg",
      1,
    ],
    [
      "whole-pig",
      "Whole dressed pig",
      "Pork & livestock",
      "A whole slaughtered and dressed pig, priced by the pound. Confirm your required weight with the team.",
      400,
      "lb",
      210,
      30,
      "/assets/pork.jpg",
      0,
    ],
    [
      "peppers",
      "Fresh sweet peppers",
      "Fresh produce",
      "Colourful sweet peppers for home kitchens, restaurants and food businesses.",
      250,
      "lb",
      9,
      15,
      "/assets/peppers.jpg",
      1,
    ],
    [
      "greens",
      "Harvest greens bundle",
      "Aquaponics",
      "A mixed bundle of seasonal leafy greens. Contents vary with the harvest.",
      400,
      "bundle",
      28,
      10,
      "/assets/greens.jpg",
      0,
    ],
    [
      "consultation",
      "Agriculture consultation",
      "Services",
      "A sample booking for a discussion of farm planning and growing methods. REAP confirms the scope, availability and appointment details.",
      2500,
      "service",
      6,
      2,
      "/assets/seedlings.jpg",
      0,
    ],
    [
      "seedlings",
      "Vegetable seedlings",
      "Farm supplies",
      "A tray of twelve young vegetable plants. Ask the team about the varieties available this week.",
      600,
      "tray",
      18,
      5,
      "/assets/seedlings.jpg",
      0,
    ],
  ];
  for (const [
    pid,
    name,
    category,
    description,
    price,
    unit,
    stock,
    threshold,
    image,
    featured,
  ] of products)
    db.prepare("INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(
      pid,
      name,
      category,
      description,
      price,
      unit,
      stock,
      threshold,
      image,
      1,
      featured,
      stamp,
    );
  db.prepare("INSERT INTO promotions VALUES (?,?,?,?,?,?,?)").run(
    "welcome",
    "FRESH10",
    10,
    100,
    0,
    new Date(Date.now() + 86400000 * 60).toISOString().slice(0, 10),
    1,
  );
  const customerNames = [
    "Demo customer",
    "Sample restaurant",
    "Sample household",
    "Sample caterer",
    "Sample grocery",
    "Sample farm",
    "Sample kitchen",
    "Sample hotel",
  ];
  customerNames.forEach((name, i) =>
    db
      .prepare("INSERT INTO customers VALUES (?,?,?,?,?,?)")
      .run(
        "c" + i,
        name,
        i === 0 ? "customer@example.test" : `sample${i}@example.test`,
        "+23100000000" + i,
        i % 2,
        stamp,
      ),
  );
  const statuses = [
    "completed",
    "completed",
    "completed",
    "confirmed",
    "preparing",
    "ready",
    "out_for_delivery",
    "received",
  ];
  for (let i = 0; i < 32; i++) {
    const created = new Date(
      Date.now() - ((31 - i) * 86400000) / 2,
    ).toISOString();
    const p = products[i % products.length],
      qty = (i % 3) + 2,
      total = p[4] * qty;
    const oid = "sample-" + i,
      status = i < 24 ? "completed" : statuses[i % 8];
    db.prepare(
      `INSERT INTO orders(id,number,customer_id,user_id,name,email,phone,fulfillment,address,preferred_date,status,subtotal,total,tracking_hash,idempotency_key,payment_method,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      oid,
      `REAP-${1040 + i}`,
      "c" + (i % 8),
      i % 8 === 0 ? "demo-customer" : null,
      customerNames[i % 8],
      i % 8 === 0 ? "customer@example.test" : `sample${i % 8}@example.test`,
      "+23100000000" + (i % 8),
      i % 3 ? "delivery" : "pickup",
      i % 3 ? "Sample address, Monrovia" : "REAP, Bentol City",
      created.slice(0, 10),
      status,
      total,
      total,
      id(),
      id(),
      "cash",
      created,
      created,
    );
    db.prepare(
      "INSERT INTO order_items(order_id,product_id,name,unit,price,quantity) VALUES (?,?,?,?,?,?)",
    ).run(oid, p[0], p[1], p[5], p[4], qty);
    db.prepare(
      "INSERT INTO order_events(order_id,status,created_at) VALUES(?,?,?)",
    ).run(oid, status, created);
    if (status === "completed")
      db.prepare("INSERT INTO payments VALUES(?,?,?,?,?,?,?)").run(
        id("pay_"),
        oid,
        total,
        "cash",
        "Demo receipt " + i,
        "demo-admin",
        created,
      );
  }
  for (const [category, description, amount] of [
    ["Feed", "Sample livestock feed", 18500],
    ["Transport", "Sample delivery fuel", 4500],
    ["Supplies", "Sample packaging supplies", 6500],
  ])
    db.prepare("INSERT INTO expenses VALUES(?,?,?,?,?,?,?)").run(
      id("exp_"),
      category,
      description,
      amount,
      stamp.slice(0, 10),
      "demo-admin",
      stamp,
    );
  db.prepare("INSERT INTO campaigns VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(
    "harvest",
    "Fresh from the farm",
    "WhatsApp",
    "Fresh produce, live tilapia and pork are available at REAP Market. Browse the harvest and arrange pickup or delivery.",
    "draft",
    5000,
    0,
    0,
    0,
    stamp.slice(0, 10),
    stamp,
  );
  db.prepare("INSERT INTO conversations VALUES(?,?,?,?,?)").run(
    id(),
    "demo-customer",
    "Hello! Can I collect my order from Bentol City?",
    0,
    stamp,
  );
}
