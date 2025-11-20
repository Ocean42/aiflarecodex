import { createCliWorkerApp } from "../cliWorkerApp.js";

createCliWorkerApp().run().catch((error) => {
  console.error("[cli-worker] fatal error", error);
  process.exit(1);
});
