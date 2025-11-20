import type { CliSummary } from "@aiflare/protocol";

export type SessionForm = {
  cliId: string;
  workdir: string;
  model: string;
};

type Props = {
  form: SessionForm;
  clis: Array<CliSummary>;
  onFormChange(field: keyof SessionForm, value: string): void;
  onCreate(): void;
};

export function SessionFormSection({
  form,
  clis,
  onFormChange,
  onCreate,
}: Props): JSX.Element {
  return (
    <section aria-label="Sessions">
      <h2>New Session</h2>
      <div className="session-form">
        <label>
          CLI:
          <select
            value={form.cliId}
            onChange={(event) => onFormChange("cliId", event.target.value)}
          >
            <option value="">Select</option>
            {clis.map((cli) => (
              <option key={cli.id} value={cli.id}>
                {cli.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Workdir:
          <input
            type="text"
            value={form.workdir}
            onChange={(event) => onFormChange("workdir", event.target.value)}
          />
        </label>
        <label>
          Model:
          <input
            type="text"
            value={form.model}
            onChange={(event) => onFormChange("model", event.target.value)}
          />
        </label>
      </div>
      <button type="button" onClick={() => void onCreate()}>
        Create Session
      </button>
    </section>
  );
}
