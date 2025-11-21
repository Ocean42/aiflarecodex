import type {
  SessionId,
  SessionMessage,
  SessionSummary,
} from "@aiflare/protocol";

type Props = {
  sessions: Array<SessionSummary>;
  activeSessionId: SessionId | null;
  messagesBySession: Map<SessionId, Array<SessionMessage>>;
  onSelect(sessionId: SessionId): void;
};

const STATUS_LABEL: Record<SessionSummary["status"], string> = {
  waiting: "IDLE",
  running: "RUNNING",
  error: "ERROR",
  completed: "DONE",
};

function getLastMessagePreview(
  messages: Array<SessionMessage> | undefined,
): string {
  if (!messages || messages.length === 0) {
    return "";
  }
  const last = messages[messages.length - 1];
  return last.content;
}

export function SessionNavigator({
  sessions,
  activeSessionId,
  messagesBySession,
  onSelect,
}: Props): JSX.Element {
  if (sessions.length === 0) {
    return (
      <section aria-label="Sessions">
        <h2>Sessions</h2>
        <p>No sessions created yet.</p>
      </section>
    );
  }

  return (
    <section aria-label="Sessions">
      <h2>Sessions</h2>
      <ul data-testid="session-list">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const preview = getLastMessagePreview(
            messagesBySession.get(session.id),
          );
          const status =
            STATUS_LABEL[session.status] ?? session.status.toUpperCase();
          return (
            <li
              key={session.id}
              className={isActive ? "active-session" : ""}
              data-active={isActive}
            >
              <button
                type="button"
                className="session-entry"
                data-testid={`session-select-${session.id}`}
                onClick={() => onSelect(session.id)}
              >
                <div className="session-entry-header">
                  <strong
                    className={`status-${session.status}`}
                    data-testid="session-status"
                  >
                    {status}
                  </strong>{" "}
                  {session.title ?? session.id}
                </div>
                <div className="session-preview">
                  <span className="session-cli">{session.cliId}</span>{" "}
                  <span className="session-model">[{session.model}]</span>
                  {preview ? (
                    <span className="session-last">{preview}</span>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
