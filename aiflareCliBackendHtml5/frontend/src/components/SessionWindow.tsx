import { useEffect, useMemo, useRef, useState } from "react";
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
  const [canceling, setCanceling] = useState(false);
  const currentRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    setInput("");
  }, [sessionId]);

  const summary = appState.sessions.get(sessionId) ?? null;
  const isRunning = summary?.status === "running";

  async function handleSend(): Promise<void> {
    if (input.trim().length === 0 || sending || isRunning) {
      return;
    }
    const content = input.trim();
    setSending(true);
    const controller = new AbortController();
    currentRequest.current = controller;
    try {
      await client.sendSessionPrompt(sessionId, content, {
        signal: controller.signal,
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("[session-window] failed to send message", error);
      }
    } finally {
      setInput("");
      setSending(false);
      currentRequest.current = null;
    }
  }

  async function handleCancel(): Promise<void> {
    if (canceling) {
      return;
    }
    setCanceling(true);
    currentRequest.current?.abort();
    currentRequest.current = null;
    try {
      await client.cancelSession(sessionId);
    } catch (error) {
      console.error("[session-window] failed to cancel session", error);
    } finally {
      setCanceling(false);
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
      {sending || isRunning ? (
        <div className="session-status" data-testid="session-run-status">
          <span className="session-spinner" aria-label="Assistant running" />
          <span>
            {canceling
              ? "Stopping current run..."
              : isRunning
                ? "Assistant is running…"
                : "Sending prompt…"}
          </span>
          {isRunning ? (
            <button
              type="button"
              className="cancel-button"
              onClick={() => void handleCancel()}
              disabled={canceling}
            >
              {canceling ? "Canceling…" : "Cancel"}
            </button>
          ) : null}
        </div>
      ) : null}
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
          disabled={sending || input.trim().length === 0 || isRunning}
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
      const prefix =
        event.role === "assistant" ? "AI" : event.role === "user" ? "You" : "System";
      const messageLines = extractMessageLines(event);
      return (
        <div data-event-type="message" data-role={event.role} className="timeline-message">
          <strong>{prefix}:</strong>
          <div className="message-content">
            {messageLines.map((line, index) => (
              <div
                key={`${event.id}-line-${index}`}
                className={`message-line${line.isPlaceholder ? " message-line-empty" : ""}`}
                data-message-line
              >
                {line.text}
              </div>
            ))}
          </div>
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

function extractMessageLines(event: Extract<SessionEvent, { type: "message" }>): Array<{
  text: string;
  isPlaceholder: boolean;
}> {
  const raw = event.content
    .map((segment) => {
      if ("text" in segment && typeof segment.text === "string") {
        return segment.text;
      }
      if ("output" in segment && typeof segment.output === "string") {
        return segment.output;
      }
      if ("error" in segment && typeof segment.error === "string") {
        return segment.error;
      }
      return "";
    })
    .join("");
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) {
    return [{ text: "<empty>", isPlaceholder: true }];
  }
  return normalized.split("\n").map((line) => ({
    text: line.length > 0 ? line : "\u00a0",
    isPlaceholder: line.trim().length === 0,
  }));
}
