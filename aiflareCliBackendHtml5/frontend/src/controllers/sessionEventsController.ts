import type { SessionEventPayload } from "../api/protoClient.js";
import type { ProtoClient } from "../api/protoClient.js";
import { appState } from "../state/appState.js";
import { recordSessionTimelineUpdate } from "../state/sessionUpdateTracker.js";

export class SessionEventsController {
  private unsubscribe?: () => void;

  constructor(private readonly client: ProtoClient) {}

  start(): void {
    if (this.unsubscribe) {
      return;
    }
    console.log("[sse-controller] connecting");
    this.unsubscribe = this.client.subscribeSessionEvents((event) => {
      console.log("[sse-controller] event", {
        type: event.type,
        sessionId: event.type === "session_events_appended" ? event.sessionId : undefined,
        eventCount: event.type === "session_events_appended" ? event.events.length : undefined,
      });
      this.handleEvent(event);
    });
  }

  stop(): void {
    if (!this.unsubscribe) {
      return;
    }
    this.unsubscribe();
    this.unsubscribe = undefined;
    console.log("[sse-controller] disconnected");
  }

  private handleEvent(event: SessionEventPayload): void {
    if (event.type !== "session_events_appended") {
      return;
    }
    if (event.summary) {
      appState.updateSession(event.summary);
    }
    if (event.events.length > 0) {
      let assistantCount = 0;
      for (const item of event.events) {
        if (item.type === "message" && item.role === "assistant") {
          assistantCount += 1;
        }
      }
      for (let i = 0; i < assistantCount; i += 1) {
        recordSessionTimelineUpdate(event.sessionId);
      }
      appState.appendSessionTimeline(event.sessionId, event.events);
    }
  }
}
