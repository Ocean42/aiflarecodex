export class CliWorkerApp {
  run(): void {
    console.log("CLI Worker placeholder run() called");
  }
}

export function createCliWorkerApp(): CliWorkerApp {
  return new CliWorkerApp();
}
