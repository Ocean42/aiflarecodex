import { useEffect, useState } from "react";
import type { SessionId, SessionMessage } from "@aiflare/protocol";
import type { ProtoClient } from "../api/protoClient.js";
import { appState } from "../state/appState.js";

type SessionWindowProps = {
  client: ProtoClient;
  sessionId: SessionId;
  messages: Array<SessionMessage>;
};

export function SessionWindow({
  client,
  sessionId,
  messages,
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
      const { messages: updated } = await client.sendSessionMessage(
        sessionId,
        content,
      );
      appState.setSessionMessages(sessionId, updated);
    } catch (error) {
      console.error("[session-window] failed to send message", error);
    } finally {
      setInput("");
      setSending(false);
    }
  }

  return (
    <section data-testid="session-window" data-session-id={sessionId}>
      <h2>{summary?.title ?? sessionId}</h2>
      <ul data-testid={`session-messages-${sessionId}`}>
        {messages.map((message) => (
          <li key={message.id} data-role={message.role}>
            <strong>{message.role === "assistant" ? "AI" : "You"}:</strong>{" "}
            <span>{message.content}</span>
          </li>
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
