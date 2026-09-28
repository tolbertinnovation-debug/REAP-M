import { createContext, useContext } from "react";
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
let csrf = null;
export const setCSRF = (value) => {
  csrf = value;
};
export async function api(path, data) {
  const r = await fetch("/api" + path, {
    credentials: "same-origin",
    headers: {
      ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(data !== undefined
      ? { method: "POST", body: JSON.stringify(data) }
      : {}),
  });
  const json = await r.json();
  if (!r.ok)
    throw new Error(json.error || "The request could not be completed.");
  return json;
}
export const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    (n || 0) / 100,
  );
export const day = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
export const today = () => new Date().toISOString().slice(0, 10);
export const label = (s) =>
  String(s || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const go = (path) => {
  window.location.hash = "#" + path;
};
export const cents = (value) => Math.round(Number(value) * 100);
