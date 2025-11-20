import { createCliWorkerApp } from "./cliWorkerApp.js";

const app = createCliWorkerApp();
app
  .run()
  .catch((error) => {
    console.error("[cli-worker] fatal error", error);
    process.exit(1);
  });
