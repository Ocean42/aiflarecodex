export class BackendApp {
  start(): void {
    console.log("BackendApp placeholder start() called");
  }
}

export function createBackendApp(): BackendApp {
  return new BackendApp();
}
