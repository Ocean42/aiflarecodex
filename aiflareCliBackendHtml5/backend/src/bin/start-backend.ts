import "dotenv/config";
import { createBackendApp } from "../backendApp.js";

const app = createBackendApp({ port: Number(process.env["BACKEND_PORT"] ?? "4310") });
console.log(`[backend] starting on port ${process.env["BACKEND_PORT"] ?? "4310"}`);
app.start();
