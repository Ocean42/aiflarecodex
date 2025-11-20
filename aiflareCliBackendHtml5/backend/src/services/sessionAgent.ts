function capitalize(text: string): string {
  if (!text) return text;
  return text.slice(0, 1).toUpperCase() + text.slice(1);
}

type SessionMemory = {
  nickname?: string;
  lastResponse?: string;
};

export class SessionAgentService {
  private readonly sessions = new Map<string, SessionMemory>();

  reset(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  handlePrompt(sessionId: string, prompt: string): string {
    const normalized = prompt.trim();
    const lower = normalized.toLowerCase();
    const state = this.sessions.get(sessionId) ?? {};
    const nicknameInstr = normalized.match(
      /wenn ich frage welche session.*?mit\s+([a-z0-9_-]+)/i,
    );
    if (nicknameInstr?.[1]) {
      state.nickname = nicknameInstr[1];
    }
    this.sessions.set(sessionId, state);
    if (
      lower.includes("welche session") &&
      !lower.includes("wenn ich frage welche session")
    ) {
      const response = state.nickname ?? sessionId;
      state.lastResponse = response;
      return response;
    }
    const instructMatch =
      normalized.match(/antworte mir bitte(?: jetzt)? mit\s+([a-z0-9 äöüß]+)/i) ??
      normalized.match(/jetzt.*mit\s+([a-z0-9 äöüß]+)/i);
    if (instructMatch?.[1]) {
      const response = capitalize(instructMatch[1].trim());
      state.lastResponse = response;
      return response;
    }
    if (lower.includes("hi ai") && lower.includes("hallo")) {
      state.lastResponse = "Hallo";
      return "Hallo";
    }
    state.lastResponse = "Okay";
    return "Okay";
  }
}
