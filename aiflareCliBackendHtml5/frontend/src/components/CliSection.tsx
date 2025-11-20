import type { CliSummary } from "@aiflare/protocol";

type Props = {
  clis: Array<CliSummary>;
  onPair(): void;
  onEnqueue(): void;
};

export function CliSection({ clis, onPair, onEnqueue }: Props): JSX.Element {
  return (
    <section aria-label="CLIs">
      <h2>CLIs</h2>
      <div className="cli-actions">
        <button type="button" onClick={() => void onPair()}>
          Pair new CLI
        </button>
        <button type="button" onClick={() => void onEnqueue()}>
          Enqueue Sample Action
        </button>
      </div>
      <ul data-testid="cli-list">
        {clis.map((cli) => (
          <li key={cli.id}>
            {cli.label} ({cli.status})
          </li>
        ))}
      </ul>
    </section>
  );
}
