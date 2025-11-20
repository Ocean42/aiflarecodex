import type { CliSummary, SessionId, SessionSummary } from "@aiflare/protocol";

export type SessionForm = {
  cliId: string;
  workdir: string;
  model: string;
};

type Props = {
  form: SessionForm;
  clis: Array<CliSummary>;
  sessions: Array<SessionSummary>;
  activeSessionId: SessionId | null;
  onFormChange(field: keyof SessionForm, value: string): void;
  onCreate(): void;
  onSelectSession(sessionId: SessionId): void;
};

export function SessionFormSection({
  form,
  clis,
  sessions,
  activeSessionId,
  onFormChange,
  onCreate,
  onSelectSession,
}: Props): JSX.Element {
  return (
    <section aria-label="Sessions">
      <h2>Sessions</h2>
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
      <ul data-testid="session-list">
        {sessions.map((session) => (
          <li
            key={session.id}
            data-active={session.id === activeSessionId}
            className={session.id === activeSessionId ? "active-session" : ""}
          >
            <button
              type="button"
              data-testid={`session-select-${session.id}`}
              onClick={() => onSelectSession(session.id)}
            >
              <strong className={`status-${session.status}`}>
                {session.title ?? session.id}
              </strong>
            </button>{" "}
            – {session.cliId} [{session.model}]
          </li>
        ))}
      </ul>
    </section>
  );
}
