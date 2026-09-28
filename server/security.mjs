import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const fail = (status, message) => {
  throw new HttpError(status, message);
};
export function str(value, label, max = 300, min = 1) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.length > max
  )
    fail(400, `${label} must contain ${min}–${max} characters.`);
  return value.trim();
}
export function integer(value, label, min = 0, max = 100000000) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    fail(400, `${label} must be a whole number between ${min} and ${max}.`);
  return value;
}
export function email(value) {
  const v = str(value, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    fail(400, "Enter a valid email address.");
  return v;
}
export function choice(value, values, label) {
  if (!values.includes(value)) fail(400, `Choose a valid ${label}.`);
  return value;
}
export function date(value, label = "Date") {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    fail(400, `${label} must be a valid date.`);
  return value;
}
export function passwordInput(value) {
  str(value, "Password", 128);
  return value;
}
export async function hashPassword(password) {
  str(password, "Password", 128, 12);
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await derive(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 67108864 })).toString("hex")}`;
}
export async function verifyPassword(password, stored) {
  const [salt, expected] = stored.split(":");
  const got = await derive(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 67108864,
  });
  return timingSafeEqual(got, Buffer.from(expected, "hex"));
}
export const roles = {
  admin: [
    "overview",
    "orders",
    "products",
    "inventory",
    "customers",
    "deliveries",
    "finance",
    "marketing",
    "messages",
    "reports",
    "team",
    "settings",
  ],
  manager: [
    "overview",
    "orders",
    "products",
    "inventory",
    "customers",
    "deliveries",
    "marketing",
    "messages",
    "reports",
  ],
  sales: ["overview", "orders", "customers", "messages"],
  dispatch: ["overview", "deliveries"],
  accountant: ["overview", "finance", "reports"],
  customer: [],
};
export function permit(user, scope) {
  if (!user) fail(401, "Please sign in to continue.");
  if (!roles[user.role]?.includes(scope))
    fail(403, "Your role does not have access to this action.");
}
export function createLimiter() {
  const entries = new Map();
  return (key, max = 20, window = 60000) => {
    const time = Date.now();
    if (entries.size > 10000)
      for (const [k, v] of entries) if (v.until < time) entries.delete(k);
    const v = entries.get(key);
    if (!v || v.until < time) {
      entries.set(key, { count: 1, until: time + window });
      return;
    }
    if (++v.count > max)
      fail(429, "Too many requests. Please try again shortly.");
  };
}
export function csv(rows) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          let v = String(value ?? "");
          if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
          return '"' + v.replaceAll('"', '""') + '"';
        })
        .join(","),
    )
    .join("\r\n");
}
