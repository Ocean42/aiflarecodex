import { useState } from "react";

type FactoryContext<T extends object> = {
  self: T;
  reRender: () => void;
};

export function useLocalState<T extends object>(
  factory: (ctx: FactoryContext<T>) => T,
): [T, number, () => void] {
  const [tick, setTick] = useState(1);
  const reRender = () => setTick((v) => v + 1);
  const [state] = useState<T>(() => {
    const self = {} as T;
    const built = factory({ self, reRender });
    Object.assign(self as object, built as object);
    return self;
  });
  return [state, tick, reRender];
}
