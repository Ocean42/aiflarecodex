import { useEffect, useLayoutEffect, useRef } from "react";
import type { SessionEvent, SessionId, SessionSummary } from "@aiflare/protocol";
import type { ProtoClient } from "../api/protoClient.js";
import { appState } from "../state/appState.js";
import { calculateContextPercentRemaining } from "../utils/context.js";
import { getSessionState, setSessionRunning } from "../state/sessionUpdateTracker.js";
import { deriveSessionTitle } from "../utils/sessionTitle.js";
import { useLocalState } from "../hooks/useLocalState.js";

type WindowLocalState = {
  input: string;
  sending: boolean;
  canceling: boolean;
  autoScroll: boolean;
  lastScroll: { scrollTop: number; scrollHeight: number } | null;
  lastSessionId: SessionId | null;
};

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
  const [view, , reRender] = useLocalState<WindowLocalState>(() => ({
    input: "",
    sending: false,
    canceling: false,
    autoScroll: true,
    lastScroll: null,
    lastSessionId: null,
  }));
  const currentRequest = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const timelineRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (view.lastSessionId === sessionId) {
      return;
    }
    view.lastSessionId = sessionId;
    view.input = "";
    view.sending = false;
    view.canceling = false;
    view.autoScroll = true;
    view.lastScroll = null;
    reRender();
  }, [reRender, sessionId]);

  function refreshAutoScrollFlag(): boolean {
    const el = timelineRef.current;
    if (!el) {
      return false;
    }
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    const isNearBottom = distanceFromBottom < 8;
    if (view.autoScroll !== isNearBottom) {
      view.autoScroll = isNearBottom;
      reRender();
    }
    return isNearBottom;
  }

  const summary = appState.sessions.get(sessionId) ?? null;
  const trackerState = getSessionState(sessionId);
  const isRunning = trackerState.running;
  const title = deriveSessionTitle(summary ?? undefined, sessionId);

  function updateSessionStatus(status: SessionSummary["status"]): void {
    const current = appState.sessions.get(sessionId);
    if (!current) {
      return;
    }
    appState.updateSession({
      ...current,
      status,
      lastUpdated: new Date().toISOString(),
    });
  }

  async function handleSend(): Promise<void> {
    const contentFromDom = inputRef.current?.value ?? view.input;
    const content = contentFromDom.trim();
    if (content.length === 0 || view.sending || isRunning) {
      return;
    }
    (window as typeof window & { __lastSessionSend?: { sessionId: SessionId; content: string } })
      .__lastSessionSend = { sessionId, content };
    console.log("[session-window] sending prompt", { sessionId, content });
    view.input = content;
    view.sending = true;
    reRender();
    setSessionRunning(sessionId, true);
    updateSessionStatus("running");
    const controller = new AbortController();
    currentRequest.current = controller;
    try {
      await client.sendSessionPrompt(sessionId, content, {
        signal: controller.signal,
      });
    } catch (error) {
      console.error("[session-window] send prompt failed", error);
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("[session-window] failed to send message", error);
        setSessionRunning(sessionId, false);
        updateSessionStatus("waiting");
      }
    } finally {
      view.input = "";
      view.sending = false;
      reRender();
      currentRequest.current = null;
    }
  }

  async function handleCancel(): Promise<void> {
    if (view.canceling) {
      return;
    }
    view.canceling = true;
    reRender();
    currentRequest.current?.abort();
    currentRequest.current = null;
    try {
      await client.cancelSession(sessionId);
    } catch (error) {
      console.error("[session-window] failed to cancel session", error);
    } finally {
      setSessionRunning(sessionId, false);
      view.canceling = false;
      reRender();
    }
  }

  const sortedTimeline = [...timeline].sort((a, b) => {
    const cmp = a.createdAt.localeCompare(b.createdAt);
    if (cmp !== 0) {
      return cmp;
    }
    return a.id.localeCompare(b.id);
  });
  const contextPercent = calculateContextPercentRemaining(sortedTimeline, summary?.model);
  const contextSeverity =
    contextPercent > 40 ? "ok" : contextPercent > 25 ? "warn" : "danger";

  useEffect(() => {
    if (!inputRef.current) return;
    const element = inputRef.current;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  }, [view.input]);

  useLayoutEffect(() => {
    const el = timelineRef.current;
    if (!el) {
      return;
    }
    if (view.autoScroll) {
      el.scrollTop = el.scrollHeight;
    } else if (view.lastScroll) {
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollTop = Math.min(view.lastScroll.scrollTop, maxScroll);
    }
    view.lastScroll = { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight };
  }, [sortedTimeline, view.autoScroll, view.lastScroll]);

  return (
    <section data-testid="session-window" data-session-id={sessionId}>
      <ul
        data-testid={`session-timeline-${sessionId}`}
        ref={timelineRef}
        onScroll={() => {
          refreshAutoScrollFlag();
          if (timelineRef.current) {
            view.lastScroll = {
              scrollTop: timelineRef.current.scrollTop,
              scrollHeight: timelineRef.current.scrollHeight,
            };
          }
        }}
      >
        {sortedTimeline.map((event) => (
          <li key={event.id}>{renderTimelineEvent(event)}</li>
        ))}
      </ul>
      <div className="context-indicator" data-testid="context-indicator">
        <span className={`context-pill context-${contextSeverity}`}>
          {Math.round(contextPercent)}% context left
        </span>
        {contextPercent <= 25 ? (
          <span className="context-warning">
            Consider trimming or summarizing older responses.
          </span>
        ) : null}
      </div>
      {view.sending || isRunning ? (
        <div className="session-status" data-testid="session-run-status">
          <span className="session-spinner" aria-label="Assistant running" />
          <span>
            {view.canceling
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
              disabled={view.canceling}
            >
              {view.canceling ? "Canceling…" : "Cancel"}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="session-input">
        <label htmlFor={`session-input-field-${sessionId}`} className="session-input-label">
          Your message
        </label>
        <textarea
          id={`session-input-field-${sessionId}`}
          data-testid={`session-input-${sessionId}`}
          value={view.input}
          onChange={(event) => {
            view.input = event.target.value;
            reRender();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          rows={1}
          placeholder="Type a message..."
          ref={inputRef}
        />
        <button
          type="button"
          data-testid={`session-send-${sessionId}`}
          onClick={() => void handleSend()}
          disabled={view.sending || isRunning}
          data-running={String(isRunning)}
          data-sending={String(view.sending)}
        >
          {view.sending ? "Sending..." : "Send"}
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
          <strong>{prefix}:</strong>{" "}
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
