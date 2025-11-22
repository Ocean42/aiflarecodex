import { useEffect, useMemo, useState } from "react";
import type { SessionEvent, SessionId } from "@aiflare/protocol";
import type { ProtoClient } from "../api/protoClient.js";
import { appState } from "../state/appState.js";

type SessionWindowProps = {
  client: ProtoClient;
  sessionId: SessionId;
  timeline: Array<SessionEvent>;
};

export function SessionWindow({
  client,
  sessionId,
  timeline,
}: SessionWindowProps): JSX.Element {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setInput("");
  }, [sessionId]);

  const summary = appState.sessions.get(sessionId) ?? null;

  async function handleSend(): Promise<void> {
    if (input.trim().length === 0 || sending) {
      return;
    }
    const content = input.trim();
    setSending(true);
    try {
      await client.sendSessionPrompt(sessionId, content);
    } catch (error) {
      console.error("[session-window] failed to send message", error);
    } finally {
      setInput("");
      setSending(false);
    }
  }

  const sortedTimeline = useMemo(
    () =>
      [...timeline].sort((a, b) => {
        const cmp = a.createdAt.localeCompare(b.createdAt);
        if (cmp !== 0) {
          return cmp;
        }
        return a.id.localeCompare(b.id);
      }),
    [timeline],
  );

  return (
    <section data-testid="session-window" data-session-id={sessionId}>
      <h2>{summary?.title ?? sessionId}</h2>
      <ul data-testid={`session-timeline-${sessionId}`}>
        {sortedTimeline.map((event) => (
          <li key={event.id}>{renderTimelineEvent(event)}</li>
        ))}
      </ul>
      <div className="session-input">
        <label htmlFor={`session-input-field-${sessionId}`}>
          Your message
        </label>
        <textarea
          id={`session-input-field-${sessionId}`}
          data-testid={`session-input-${sessionId}`}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          rows={3}
          placeholder="Type a message..."
        />
        <button
          type="button"
          data-testid={`session-send-${sessionId}`}
          onClick={() => void handleSend()}
          disabled={sending || input.trim().length === 0}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </section>
  );
}

function renderTimelineEvent(event: SessionEvent): JSX.Element {
  switch (event.type) {
    case "message": {
      const prefix = event.role === "assistant" ? "AI" : event.role === "user" ? "You" : "System";
      const text = event.content
        .map((segment) => {
          if ("text" in segment && segment.text) {
            return segment.text;
          }
          if ("output" in segment && segment.output) {
            return segment.output;
          }
          return "";
        })
        .filter(Boolean)
        .join(" ")
        .trim();
      return (
        <div data-event-type="message" data-role={event.role}>
          <strong>{prefix}:</strong> <span>{text || "<empty>"}</span>
        </div>
      );
    }
    case "plan_update":
      return (
        <div data-event-type="plan">
          <strong>Plan Update:</strong>{" "}
          {event.explanation ?? event.plan.map((item) => `${item.status} ${item.step}`).join(", ")}
        </div>
      );
    case "exec_event":
      return (
        <div data-event-type="exec">
          <strong>Exec {event.phase === "begin" ? "started" : "ended"}:</strong>{" "}
          {event.command.join(" ")}
        </div>
      );
    case "exec_output":
      return (
        <div data-event-type="exec-output">
          <strong>{event.stream}:</strong> <span>{event.text}</span>
        </div>
      );
    case "tool_call_started":
      return (
        <div data-event-type="tool-start">
          <strong>Tool started:</strong> {event.toolName} ({event.callId})
        </div>
      );
    case "tool_call_output":
      return (
        <div data-event-type="tool-result">
          <strong>Tool {event.status === "ok" ? "completed" : "failed"}:</strong>{" "}
          {event.toolName}
        </div>
      );
    case "reasoning_content_delta":
    case "reasoning_summary_delta":
      return (
        <div data-event-type="reasoning">
          <strong>Thinking:</strong> <span>{event.delta}</span>
        </div>
      );
    case "reasoning_section_break":
      return <hr />;
    default:
      return <div>{JSON.stringify(event)}</div>;
  }
}
