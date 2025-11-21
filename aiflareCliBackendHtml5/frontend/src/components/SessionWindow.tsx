import { useEffect, useState } from "react";
import type { SessionId, SessionMessage } from "@aiflare/protocol";
import type { ProtoClient } from "../api/protoClient.js";
import { appState } from "../state/appState.js";

type SessionWindowProps = {
  client: ProtoClient;
  activeSessionId: SessionId | null;
  messages: Array<SessionMessage>;
};

export function SessionWindow({
  client,
  activeSessionId,
  messages,
}: SessionWindowProps): JSX.Element {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setInput("");
  }, [activeSessionId]);

  const activeSummary =
    activeSessionId !== null ? appState.sessions.get(activeSessionId) : null;

  async function handleSend(): Promise<void> {
    if (!activeSessionId || input.trim().length === 0 || sending) {
      return;
    }
    const sessionId = activeSessionId;
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

  if (!activeSessionId) {
    return (
      <section data-testid="session-window">
        <p>Select a session to start chatting.</p>
      </section>
    );
  }

  return (
    <section data-testid="session-window">
      <h2>{activeSummary?.title ?? activeSessionId}</h2>
      <ul data-testid="session-messages">
        {messages.map((message) => (
          <li key={message.id} data-role={message.role}>
            <strong>{message.role === "assistant" ? "AI" : "You"}:</strong>{" "}
            <span>{message.content}</span>
          </li>
        ))}
      </ul>
      <div className="session-input">
        <label htmlFor="session-input-field">Your message</label>
        <textarea
          id="session-input-field"
          data-testid="session-input"
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
          data-testid="session-send"
          onClick={() => void handleSend()}
          disabled={sending || input.trim().length === 0}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </section>
  );
}
