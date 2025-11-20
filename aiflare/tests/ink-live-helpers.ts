export interface WaitForFrameOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

export async function waitForFrame(
  readFrame: () => string,
  flush: () => Promise<void>,
  predicate: (frame: string) => boolean,
  options?: WaitForFrameOptions,
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const intervalMs = options?.intervalMs ?? 500;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await flush();
    const frame = readFrame();
    if (predicate(frame)) {
      return frame;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(
    `Timed out waiting for frame match. Last frame:\n${readFrame()}`,
  );
}
