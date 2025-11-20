import { createBackendApp } from "../backendApp.js";

const app = createBackendApp({ port: Number(process.env["BACKEND_PORT"] ?? "4310") });
app.start();
