import type { CliSummary } from "@aiflare/protocol";
import type { SessionForm } from "./SessionFormSection.js";
import { useLocalState } from "../hooks/useLocalState.js";

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
  const [view, , reRender] = useLocalState<{
    form: SessionForm;
    submitting: boolean;
    error: string | null;
    lastInitialKey: string;
    lastCliKey: string;
  }>(() => ({
    form: { ...initialForm },
    submitting: false,
    error: null,
    lastInitialKey: "",
    lastCliKey: "",
  }));

  const nextInitialKey = `${initialForm.cliId}::${initialForm.workdir}::${initialForm.model}`;
  const nextCliKey = clis.map((cli) => cli.id).join("|");
  if (view.lastInitialKey !== nextInitialKey || view.lastCliKey !== nextCliKey) {
    const firstCli = clis[0]?.id ?? "";
    const merged: SessionForm = {
      cliId: view.form.cliId || initialForm.cliId || firstCli,
      workdir: view.form.workdir || initialForm.workdir,
      model: view.form.model || initialForm.model,
    };
    const cliExists = merged.cliId && clis.some((cli) => cli.id === merged.cliId);
    if (!cliExists && firstCli) {
      merged.cliId = firstCli;
    }
    view.form = merged;
    view.lastInitialKey = nextInitialKey;
    view.lastCliKey = nextCliKey;
  }

  const handleSubmit = async (): Promise<void> => {
    if (view.submitting) {
      return;
    }
    view.submitting = true;
    view.error = null;
    reRender();
    try {
      await onCreate(view.form);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create session";
      view.error = message;
    } finally {
      view.submitting = false;
      reRender();
    }
  };

  const cliOptions = clis.map((cli) => ({ id: cli.id, label: cli.label ?? cli.id }));

  return (
    <section className="session-creator" data-testid="session-create-panel">
      <h2>New Session</h2>
      <div className="session-form">
        <label>
          CLI:
          <select
            data-testid="session-create-cli"
            value={view.form.cliId}
            onChange={(event) => {
              view.form = { ...view.form, cliId: event.target.value };
              reRender();
            }}
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
            value={view.form.workdir}
            onChange={(event) => {
              view.form = { ...view.form, workdir: event.target.value };
              reRender();
            }}
            placeholder="/tmp"
          />
        </label>
        <label>
          Model:
          <input
            data-testid="session-create-model"
            type="text"
            value={view.form.model}
            onChange={(event) => {
              view.form = { ...view.form, model: event.target.value };
              reRender();
            }}
            placeholder="gpt-5.1-codex"
          />
        </label>
        <button
          type="button"
          data-testid="session-create-submit"
          onClick={() => void handleSubmit()}
          disabled={
            view.submitting ||
            clis.length === 0 ||
            !view.form.cliId ||
            !view.form.workdir ||
            !view.form.model
          }
        >
          {view.submitting ? "Creating..." : "Create Session"}
        </button>
        {view.error ? <p className="error-text">{view.error}</p> : null}
      </div>
    </section>
  );
}
