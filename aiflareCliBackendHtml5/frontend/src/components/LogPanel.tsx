export type LogEntry = {
  id: string;
  timestamp: string;
  message: string;
};

type Props = {
  logs: Array<LogEntry>;
};

export function LogPanel({ logs }: Props): JSX.Element {
  return (
    <section aria-label="Client Logs">
      <h2>Client Logs</h2>
      <ul data-testid="client-logs">
        {logs.map((log) => (
          <li key={log.id}>
            [{log.timestamp}] {log.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
