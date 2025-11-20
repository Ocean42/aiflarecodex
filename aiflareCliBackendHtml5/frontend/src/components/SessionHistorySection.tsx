type HistoryEntry = {
  timestamp: string;
  event: string;
  data?: unknown;
};

type Props = {
  history: Array<HistoryEntry>;
};

export function SessionHistorySection({ history }: Props): JSX.Element {
  return (
    <section aria-label="Session History">
      <h2>Session History</h2>
      <ul data-testid="session-history">
        {history.map((item, index) => (
          <li key={`${item.event}-${index}`}>
            [{item.timestamp}] {item.event}
          </li>
        ))}
      </ul>
    </section>
  );
}
