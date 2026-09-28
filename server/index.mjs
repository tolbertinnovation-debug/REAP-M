import { createApp } from "./app.mjs";
const app = await createApp();
const port = Number(process.env.PORT || 3000);
app.server.listen(port, process.env.HOST || "0.0.0.0", () =>
  console.log(
    `REAP Market listening on ${port}; ${process.env.DEMO_MODE === "true" ? "demonstration" : "live"} mode`,
  ),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => app.close().then(() => process.exit(0)));
