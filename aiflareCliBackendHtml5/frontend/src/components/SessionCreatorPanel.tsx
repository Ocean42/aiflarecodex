import { useEffect, useMemo, useState } from "react";
import type { CliSummary } from "@aiflare/protocol";
import type { SessionForm } from "./SessionFormSection.js";

type Props = {
  clis: Array<CliSummary>;
  initialForm: SessionForm;
  onCreate(form: SessionForm): Promise<void>;
};

export function SessionCreatorPanel({
  clis,
  initialForm,
  onCreate,
}: Props): JSX.Element {
  const [form, setForm] = useState<SessionForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      cliId: current.cliId || initialForm.cliId,
      workdir: current.workdir || initialForm.workdir,
      model: current.model || initialForm.model,
    }));
  }, [initialForm]);

  useEffect(() => {
    const firstCli = clis[0]?.id;
    if (!firstCli) {
      return;
    }
    setForm((current) => {
      if (current.cliId && clis.some((cli) => cli.id === current.cliId)) {
        return current;
      }
      return { ...current, cliId: firstCli };
    });
  }, [clis]);

  const cliOptions = useMemo(
    () => clis.map((cli) => ({ id: cli.id, label: cli.label ?? cli.id })),
    [clis],
  );

  const handleSubmit = async (): Promise<void> => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate(form);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create session";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="session-creator" data-testid="session-create-panel">
      <h2>New Session</h2>
      <div className="session-form">
        <label>
          CLI:
          <select
            data-testid="session-create-cli"
            value={form.cliId}
            onChange={(event) =>
              setForm({ ...form, cliId: event.target.value })
            }
            disabled={clis.length === 0}
          >
            {clis.length === 0 ? (
              <option value="">No CLI registered</option>
            ) : null}
            {cliOptions.map((cli) => (
              <option key={cli.id} value={cli.id}>
                {cli.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Workdir:
          <input
            data-testid="session-create-workdir"
            type="text"
            value={form.workdir}
            onChange={(event) =>
              setForm({ ...form, workdir: event.target.value })
            }
            placeholder="/tmp"
          />
        </label>
        <label>
          Model:
          <input
            data-testid="session-create-model"
            type="text"
            value={form.model}
            onChange={(event) =>
              setForm({ ...form, model: event.target.value })
            }
            placeholder="gpt-5.1-codex"
          />
        </label>
        <button
          type="button"
          data-testid="session-create-submit"
          onClick={() => void handleSubmit()}
          disabled={
            submitting ||
            clis.length === 0 ||
            !form.cliId ||
            !form.workdir ||
            !form.model
          }
        >
          {submitting ? "Creating..." : "Create Session"}
        </button>
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </section>
  );
}
