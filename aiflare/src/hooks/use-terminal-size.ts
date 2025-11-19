import { useSyncExternalStore } from "react";

const TERMINAL_PADDING_X = 8;

type TerminalSize = { columns: number; rows: number };

function readTerminalSize(): TerminalSize {
  const columns =
    (typeof process.stdout?.columns === "number"
      ? process.stdout.columns
      : 60) - TERMINAL_PADDING_X;
  const rows =
    typeof process.stdout?.rows === "number" ? process.stdout.rows : 20;
  return {
    columns: Math.max(1, columns),
    rows,
  };
}

const subscribers = new Set<() => void>();
let cachedSize: TerminalSize = readTerminalSize();

const resizeListener = () => {
  cachedSize = readTerminalSize();
  for (const listener of subscribers) {
    listener();
  }
};

function subscribe(listener: () => void): () => void {
  subscribers.add(listener);
  if (subscribers.size === 1 && typeof process.stdout?.on === "function") {
    process.stdout.on("resize", resizeListener);
  }
  return () => {
    subscribers.delete(listener);
    if (subscribers.size === 0 && typeof process.stdout?.off === "function") {
      process.stdout.off("resize", resizeListener);
    }
  };
}

function getSnapshot(): TerminalSize {
  return cachedSize;
}

function getServerSnapshot(): TerminalSize {
  return {
    columns: 80 - TERMINAL_PADDING_X,
    rows: 24,
  };
}

export function useTerminalSize(): TerminalSize {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
