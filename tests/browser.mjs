import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../server/app.mjs";

const folder = mkdtempSync(join(tmpdir(), "reap-browser-"));
const app = await createApp({
  demo: true,
  dbPath: join(folder, "demo.sqlite"),
});
await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
const base = "http://127.0.0.1:" + app.server.address().port;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [],
  results = [];
page.on("pageerror", (e) => errors.push(e.message));
mkdirSync("docs/screenshots", { recursive: true });
const check = async (name, fn) => {
  await fn();
  results.push(name);
  console.log("PASS " + name);
};
async function route(path) {
  await page.goto(base + "/#" + path);
  await page.waitForLoadState("networkidle");
}
async function noOverflow() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Page overflow",
  );
}
async function accessible() {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    r.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
  );
}

try {
  await check(
    "Desktop storefront renders with local assets and passes accessibility scan",
    async () => {
      await route("/");
      await page
        .getByRole("heading", { name: "Good food. Greater purpose." })
        .waitFor();
      assert.equal(
        await page
          .locator("img")
          .evaluateAll(
            (imgs) =>
              imgs.filter((i) => !i.complete || i.naturalWidth === 0).length,
          ),
        0,
      );
      await noOverflow();
      await accessible();
      await page.screenshot({
        path: "docs/screenshots/storefront-desktop.jpg",
        fullPage: true,
        type: "jpeg",
        quality: 85,
      });
    },
  );
  await check(
    "Product search, basket and delivery checkout work end to end",
    async () => {
      await route("/shop");
      await page
        .getByRole("textbox", { name: "Search products" })
        .fill("lettuce");
      assert.equal(await page.locator(".product-card").count(), 1);
      await page
        .getByRole("button", { name: "Add Aquaponic lettuce to basket" })
        .click();
      await route("/basket");
      await page.getByRole("radio", { name: /Delivery/ }).check();
      await page
        .getByRole("textbox", { name: "Promotion code" })
        .fill("FRESH10");
      await page.getByRole("button", { name: "Apply", exact: true }).click();
      await page.getByRole("button", { name: "Continue to checkout" }).click();
      await page.getByLabel("Full name").fill("Browser Test Buyer");
      await page.getByLabel("Email address").fill("browser-test@example.test");
      await page.getByLabel("Phone number").fill("+231770000001");
      await page
        .getByLabel("Delivery address")
        .fill("Demonstration address, Monrovia, near the market");
      await page.getByRole("checkbox", { name: /I have reviewed/ }).check();
      await page.getByRole("button", { name: "Place demo order" }).click();
      await page.getByRole("heading", { name: "Your order is in." }).waitFor();
      assert.equal(await page.locator(".summary-total").count(), 0);
      const code = await page.locator(".tracking-code code").innerText();
      assert.equal(code.length, 64);
      await accessible();
      await route("/track");
      await page.getByLabel("Tracking code").fill(code);
      await page.getByRole("button", { name: "Find my order" }).click();
      await page.getByText("Browser Test Buyer", { exact: true }).waitFor();
      assert.ok(
        (await page.locator(".invoice-totals").innerText()).includes("$6.80"),
      );
    },
  );
  await check(
    "Customer demo account shows order history and sends an inbox message",
    async () => {
      await route("/account");
      await page.getByRole("button", { name: "Try customer demo" }).click();
      await page.getByRole("heading", { name: "Hello, Demo." }).waitFor();
      assert.ok((await page.locator(".account-order").count()) > 0);
      await page.getByRole("button", { name: "Messages", exact: true }).click();
      await page
        .getByLabel("Your message")
        .fill("Browser test: can I collect at Bentol?");
      await page
        .getByRole("button", { name: "Send message", exact: true })
        .click();
      await page
        .getByText("Browser test: can I collect at Bentol?", { exact: true })
        .waitFor();
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await page
        .getByRole("heading", { name: "Good food. Greater purpose." })
        .waitFor();
    },
  );
  await check(
    "Administrator workspace and every main section render",
    async () => {
      await route("/admin");
      await page.getByRole("button", { name: "Open admin demo" }).click();
      await page.getByText("A fresh look at your day.").waitFor();
      await noOverflow();
      await accessible();
      await page.screenshot({
        path: "docs/screenshots/dashboard-desktop.jpg",
        fullPage: true,
        type: "jpeg",
        quality: 85,
      });
      for (const section of [
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
        "security",
      ]) {
        await route("/admin/" + section);
        assert.equal(await page.locator("main h1").count(), 1);
        assert.equal(
          await page
            .getByText("This area is reserved for another role")
            .count(),
          0,
        );
        await noOverflow();
      }
    },
  );
  await check(
    "Product creation and inventory adjustment persist through the API",
    async () => {
      await route("/admin/products");
      await page
        .getByRole("button", { name: "Add product", exact: true })
        .click();
      await page.getByLabel("Product name").fill("Browser test service");
      await page
        .getByLabel("Category", { exact: true })
        .selectOption("Services");
      await page
        .getByLabel("Description", { exact: true })
        .fill(
          "A demonstration service created by the browser regression suite.",
        );
      await page.getByLabel("Price (USD)").fill("25");
      await page.getByLabel("Selling unit").selectOption("service");
      await page.getByLabel("Opening stock").fill("12");
      await page
        .getByRole("button", { name: "Create product", exact: true })
        .click();
      await page.getByText("Browser test service", { exact: true }).waitFor();
      await route("/admin/inventory");
      await page
        .getByRole("textbox", { name: "Search inventory…" })
        .fill("Browser test service");
      await page
        .getByRole("button", { name: "Adjust stock", exact: true })
        .click();
      await page.getByLabel("Quantity change").fill("3");
      await page
        .getByLabel("Reason for adjustment")
        .fill("Browser test opening adjustment");
      await page.getByRole("button", { name: "Record adjustment" }).click();
      await page
        .getByText("Browser test opening adjustment", { exact: true })
        .waitFor();
    },
  );
  await check("Financial entry form saves an expense", async () => {
    await route("/admin/finance");
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.getByLabel("Amount (USD)").fill("12.50");
    await page
      .getByLabel("Description / reference")
      .fill("Browser test packaging expense");
    await page.getByRole("button", { name: "Save expense" }).click();
    await page.getByRole("button", { name: "Expenses", exact: true }).click();
    await page
      .getByText("Browser test packaging expense", { exact: true })
      .waitFor();
  });
  await check(
    "Desktop workspace mobile layouts stay within 360 and 390 pixel screens",
    async () => {
      for (const width of [360, 390]) {
        await page.setViewportSize({ width, height: 844 });
        for (const section of [
          "",
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
        ]) {
          await route("/admin/" + section);
          await noOverflow();
        }
        await route("/admin");
        await page.getByRole("button", { name: "Open dashboard menu" }).click();
        assert.ok(await page.locator(".admin-sidebar.open").isVisible());
        await page.getByRole("button", { name: "Close menu" }).click();
      }
      await accessible();
      await page.screenshot({
        path: "docs/screenshots/dashboard-mobile.jpg",
        fullPage: true,
        type: "jpeg",
        quality: 85,
      });
    },
  );
  await check(
    "Mobile customer pages, menu and shop pass accessibility scans",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const path of [
        "/",
        "/shop",
        "/about",
        "/help",
        "/privacy",
        "/track",
        "/basket",
      ]) {
        await route(path);
        await noOverflow();
        if (["/", "/shop", "/track"].includes(path)) await accessible();
      }
      await route("/");
      await page.getByRole("button", { name: "Toggle navigation" }).click();
      assert.ok(await page.locator("nav.open").isVisible());
      await page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: "Shop the harvest" })
        .click();
      await page
        .getByRole("heading", { name: "The good things start here." })
        .waitFor();
      await route("/");
      await page.screenshot({
        path: "docs/screenshots/storefront-mobile.jpg",
        fullPage: true,
        type: "jpeg",
        quality: 85,
      });
    },
  );
  assert.deepEqual(errors, [], "No browser runtime errors");
  writeFileSync(
    "docs/browser-results.json",
    JSON.stringify(
      {
        checks: results,
        viewport_sizes: ["1440×1000", "390×844", "360×844"],
        runtime_errors: errors,
        accessibility_standard_tags: ["wcag2a", "wcag2aa", "wcag21aa"],
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Completed ${results.length} browser checks without runtime errors.`,
  );
} finally {
  await context.close();
  await browser.close();
  await app.close();
  rmSync(folder, { recursive: true, force: true });
}
