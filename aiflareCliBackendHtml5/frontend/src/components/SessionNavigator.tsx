import type { SessionEvent, SessionId, SessionSummary } from "@aiflare/protocol";

type Props = {
  sessions: Array<SessionSummary>;
  openSessionIds: Array<SessionId>;
  timelineBySession: Map<SessionId, Array<SessionEvent>>;
  onSelect(sessionId: SessionId): void;
};

const STATUS_LABEL: Record<SessionSummary["status"], string> = {
  waiting: "IDLE",
  running: "RUNNING",
  error: "ERROR",
  completed: "DONE",
};

function getLastMessagePreview(
  events: Array<SessionEvent> | undefined,
): string {
  if (!events || events.length === 0) {
    return "";
  }
  const reversed = [...events].reverse();
  const lastMessage = reversed.find((event) => event.type === "message");
  if (!lastMessage || lastMessage.type !== "message") {
    return "";
  }
  const text = lastMessage.content
    .map((segment) => ("text" in segment && segment.text ? segment.text : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
  return text;
}

export function SessionNavigator({
  sessions,
  openSessionIds,
  timelineBySession,
  onSelect,
}: Props): JSX.Element {
  console.log(
    "[frontend][session-navigator]",
    JSON.stringify(
      sessions.map((session) => ({
        id: session.id,
        status: session.status,
        timelineEvents: timelineBySession.get(session.id)?.length ?? 0,
      })),
    ),
  );
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
          const isActive = openSessionIds.includes(session.id);
          const preview = getLastMessagePreview(
            timelineBySession.get(session.id),
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
