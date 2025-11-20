import { useEffect } from "react";
import type { SessionId, SessionMessage } from "@aiflare/protocol";
import type { ProtoClient } from "../api/protoClient.js";
import { useLocalState } from "../hooks/useLocalState.js";
import { appState } from "../state/appState.js";

type SessionWindowViewModel = {
  activeSessionId: SessionId | null;
  messages: Array<SessionMessage>;
  input: string;
  sending: boolean;
  sync(): void;
  setInput(value: string): void;
  send(): Promise<void>;
  dispose?: () => void;
};

type SessionWindowProps = {
  client: ProtoClient;
};

export function SessionWindow({ client }: SessionWindowProps): JSX.Element {
  const [view] = useLocalState<SessionWindowViewModel>(({ self, reRender }) => {
    const vm: SessionWindowViewModel = Object.assign(self, {
      activeSessionId: appState.activeSessionId,
      messages: appState.activeSessionId
        ? appState.sessionMessages.get(appState.activeSessionId) ?? []
        : [],
      input: "",
      sending: false,
      sync() {
        vm.activeSessionId = appState.activeSessionId;
        vm.messages =
          vm.activeSessionId && appState.sessionMessages.has(vm.activeSessionId)
            ? appState.sessionMessages.get(vm.activeSessionId)!
            : [];
      },
      setInput(value: string) {
        vm.input = value;
        reRender();
      },
      async send() {
        if (!vm.activeSessionId || vm.input.trim().length === 0 || vm.sending) {
          return;
        }
        const sessionId = vm.activeSessionId;
        const content = vm.input.trim();
        vm.sending = true;
        reRender();
        try {
          const { messages } = await client.sendSessionMessage(sessionId, content);
          appState.setSessionMessages(sessionId, messages);
        } catch (error) {
          console.error("[session-window] failed to send message", error);
        } finally {
          vm.input = "";
          vm.sending = false;
          reRender();
        }
      },
    });
    const unsubscribe = appState.subscribe(() => {
      vm.sync();
      reRender();
    });
    vm.dispose = unsubscribe;
    vm.sync();
    return vm;
  });

  useEffect(() => {
    return () => {
      view.dispose?.();
    };
  }, [view]);

  const activeSummary =
    view.activeSessionId !== null ? appState.sessions.get(view.activeSessionId) : null;

  if (!view.activeSessionId) {
    return (
      <section data-testid="session-window">
        <p>Select a session to start chatting.</p>
      </section>
    );
  }

  return (
    <section data-testid="session-window">
      <h2>{activeSummary?.title ?? view.activeSessionId}</h2>
      <ul data-testid="session-messages">
        {view.messages.map((message) => (
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
          value={view.input}
          onChange={(event) => view.setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void view.send();
            }
          }}
          rows={3}
          placeholder="Type a message..."
        />
        <button
          type="button"
          data-testid="session-send"
          onClick={() => void view.send()}
          disabled={view.sending || view.input.trim().length === 0}
        >
          {view.sending ? "Sending..." : "Send"}
        </button>
      </div>
    </section>
  );
}
