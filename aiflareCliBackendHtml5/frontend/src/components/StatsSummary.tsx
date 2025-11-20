type Props = {
  cliCount: number;
  sessionCount: number;
};

export function StatsSummary({ cliCount, sessionCount }: Props): JSX.Element {
  return (
    <section aria-label="Stats">
      <p data-testid="stats-cli">Connected CLIs: {cliCount}</p>
      <p data-testid="stats-sessions">Active Sessions: {sessionCount}</p>
    </section>
  );
}
