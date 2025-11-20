# HTML5 Frontend Architektur
```
┌─────────────────────────────────────────────────────────────┐
│                SPA (React + Vite + TS)                      │
│                                                             │
│  ┌────────────┐    ┌────────────────────┐    ┌─────────────────┐   │
│  │ DataLayer  │──▶ │ Non-React State    │──▶ │ UI Components    │   │
│  │ (REST/WS)  │    │ Store (plain TS)   │    │ (per view        │   │
│  └─────┬──────┘    └────────┬──────────┘    │  useLocalState)  │   │
│        │                    │               └────────┬─────────┘   │
│        │ WS Deltas          │ obj mutationen         │            │
│        ▼                    ▼                        ▼            │
│  ┌────────────┐   REST    ┌────────────┐   ┌─────────────┐  │
│  │ ProtoClient│◀────────▶│ Backend API │◀─│ Auth Banner │  │
│  └────────────┘          └────────────┘   └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Architekturprinzipien
- Single Page App, React Router für Views (Dashboard, Session Detail, Settings).
- Zentraler Zustand ohne externe React-State-Library: Der globale App-State lebt in einem normalen TypeScript-Store (ein Objektbaum, z. B. `appState.clis`, `appState.sessions`). Das DataLayer (REST/WS) mutiert diesen Store direkt.
- React-Komponenten greifen nicht direkt auf `appState` zu, sondern erstellen über `useLocalState` lokale View-Model-Kopien, lesen daraus und abonnieren bei Bedarf Events des Stores, um `reRender` aufzurufen.

```ts
import { useState } from "react";

// Helper: Lokales State-Objekt + manueller reRender-Trigger.
// Gibt ein Tupel zurück: [state, reRenderId, reRender]
// Factory erhält { self, reRender }, damit Methoden auf den State zugreifen können.
export function useLocalState<T extends object>(
  factory: (ctx: { self: T; reRender: () => void }) => T,
): [T, number, () => void] {
  const [reRenderId, setReRenderId] = useState(1);
  const reRender = () => setReRenderId((v) => v + 1);
  const [state] = useState<T>(() => {
    const self = {} as T;
    const built = factory({ self, reRender });
    Object.assign(self as object, built as object);
    return self;
  });
  return [state, reRenderId, reRender];
}
```

- **Kein Einsatz** von `useCallback`, `useMemo` oder `useEffect`. Initiale Ladevorgänge oder Start von Streams erfolgen direkt in der Factory-Funktion von `useLocalState`.
- Komponenten sind rein darstellend und bedienen Interaktionen ausschließlich über Commands (`FrontendCommand` via REST/WS).
- Auth wird im UI sichtbar gesteuert (Banner, Modal). Ohne gültige Tokens bleibt Session-UI deaktiviert.

---

## Module & Komponenten

### 1. Infrastruktur
1. **`src/api/proto-client.ts`**
   - Klasse `ProtoClient`: Typsichere Wrapper um Protocol-Package (REST + WS).
   - Methoden:
     - `async fetchBootstrap(): Promise<BootstrapState>`
     - `connectDeltas(onDelta)` verbindet per WebSocket/SSE.
     - `postCommand(command: FrontendCommand)`.
     - `getAuthStatus()`, `requestLoginLink()`.
2. **`src/state/app-state.ts`**
   - Klasse `AppState`: Hält globale Datenstruktur (`this.clis`, `this.sessions`, `this.auth`).
   - Methoden: `updateSession(session)`, `getSessions()`, `subscribe(event, listener)`.
   - Keine freien Funktionen; Komponenten importieren die Instanz `appState` und rufen deren Methoden auf.

### 2. Auth Layer
1. **`AuthBanner` Komponente**
   - Zeigt `Login required` + Button „Bei Codex anmelden“.
   - Klick → `requestLoginLink()` → öffnet neues Tab.
   - Lauscht auf `authStatusUpdated` Delta.
2. **`LinkedCliList` (Modal)**
   - Zeigt alle registrierten CLIs, markiert Pairing-Status.

### 3. Dashboard
1. **`CliPanel`**
   - Karte pro CLI (Status, Sessions, OS, lastSeen).
   - Buttons: `Reconnect` (sendet Command), `Details`.
2. **`SessionList`**
   - Tabs oder Sidebar mit Sessions; Filter nach CLI/Status.
   - Zeigt Badge, wenn CLI disconnected.
3. **`NewSessionDialog`**
   - Formular: CLI-Auswahl, Workdir (Text), Initialprompt, Model.
   - Submit → POST `/api/sessions`.

### 4. Session View
1. **`SessionHeader`**
   - Infos: Model, Approval Mode, CLI, RateLimit.
   - Buttons: `Stop`, `Force reconnect`.
2. **`SessionTimeline`**
   - Rendert `AgentResponseItem` als Message Cards.
   - Reuse Formatierung aus CLI (Portierung von `TerminalMessageHistory` nach DOM).
3. **`PlanPanel`**
   - Visualisiert `formatPlanUpdate`.
4. **`ActionLog`**
   - Live-Liste aktueller Commands mit Status (awaiting approval, running, done).
5. **`PromptInput`**
   - Textarea + Attachments (Images). Sendet `send_prompt`.

### 5. Approval UX
1. **`ApprovalDrawer`**
   - Slide-out Panel mit wartenden Approvals.
   - Buttons: `Approve`, `Reject`, optional Erklärung.
2. **`CommandDetailsModal`**
   - Zeigt `formatCommandForDisplay`, `CommandExplanation` (vom Backend vorbereitet).

### 6. Notifications
1. **`ToastCenter`**
   - Benachrichtigungen für CLI-Disconnect, Auth-Events, Session-Fehler.
2. **`LiveStatusBar`**
   - Footer mit `Connected to backend`, `Delta lag`, `CLI count`.

### 7. Routing / Shell
1. **`AppShell`**
   - Layout (Sidebar + Content). Bindet `AuthBanner` top-level.
2. **Routes**
   - `/` → Dashboard.
   - `/sessions/:id` → Session Detail.
   - `/settings` → optional (Workdir defaults, theme).

---

## Klassen-/Funktions-Design

| Datei | Verantwortung | Wichtige Funktionen |
| --- | --- | --- |
| `src/api/http-client.ts` | Fetch Wrapper mit Error Handling | `request<T>(method, path, body?)` |
| `src/api/delta-client.ts` | WebSocket-Streaming | `connect(onMessage)`, `reconnect()` |
| `src/hooks/useBootstrap.ts` | entfällt (Bootstrap direkt in useLocalState-Factory) |  |
| `src/hooks/useCommandSender.ts` | entfällt (Komponenten callen ProtoClient direkt) |  |
| `src/components/SessionTimeline/Message.tsx` | Darstellung Agent Items | Props: `item`, `onOpenFile` |
| `src/components/PlanPanel.tsx` | Plan Visualisierung | `renderPlanNodes(plan)` |
| `src/components/Approvals/ApprovalDrawer.tsx` | Approvals | `approve(approvalId)`, `reject(...)` |

---

## Datenfluss
1. **Initial Load**
   - Root-Komponente erstellt via `useLocalState` ein ViewModel, das sofort `protoClient.fetchBootstrap()` aufruft und die Ergebnisse in `appState` schreibt.
   - `appState` hält `auth`, `clis`, `sessions`. Direkt nach Bootstrap wird der Delta-Stream per `deltaClient.connect()` gestartet.
2. **Delta Handling**
   - Jede Delta-Nachricht → `store.applyDelta(delta)`.
   - Selektoren lösen Re-render aus.
3. **Commands**
   - UI-Interaktion → `Commands API`.
   - Erfolgs-/Fehlerfeedback via Toasts.

---

## Stil & Technische Details
- Styling via Tailwind oder CSS Modules + Design Tokens (light/dark).
- Komponenten isoliert, Tests ausschließlich mit Playwright (nutzt dessen integrierten Test Runner auch für UI-Zustände).
- Internationalisierung optional (Deutsch/Englisch toggle).

---

## Playwright Hooks
- Fixtures:
  - `frontendPage`: startet `npm run web:dev -- --port=0`.
  - `backendHandle`: injiziert Basis-URL, Proxy.
  - `cliProcess`: siehe E2E-Konzept.
- Tests:
  - `auth-flow.spec.ts`: Prüft Banner, Login-Link.
  - `multi-session.spec.ts`, `approval.spec.ts`, `disconnect.spec.ts`.
### Beispiel-Nutzung von `useLocalState` (AuthBanner)
```tsx
function AuthBanner(): JSX.Element | null {
  const [state, _tick, reRender] = useLocalState(() => {
    const viewModel = {
      visible: true,
      status: "unknown" as "unknown" | "valid" | "missing",
      async requestLink() {
        const link = await protoClient.requestLoginLink();
        window.open(link.url, "_blank");
      },
      syncFromStore() {
        const auth = appState.auth;
        viewModel.status = auth.valid ? "valid" : "missing";
        viewModel.visible = !auth.valid;
      },
    };
    viewModel.syncFromStore();
    appState.subscribe("auth", () => {
      viewModel.syncFromStore();
      reRender();
    });
    return viewModel;
  });

  if (!state.visible || state.status === "valid") {
    return null;
  }
  return (
    <div className="auth-banner">
      <p>Login notwendig</p>
      <button onClick={state.requestLink}>Bei Codex anmelden</button>
    </div>
  );
}
```
*Hinweis:* Die Factory-Funktion setzt Methoden direkt auf das State-Objekt; Re-Renders werden über `reRender()` ausgelöst. Initiale Daten werden durch `syncFromStore()` geladen, `appState.subscribe` triggert Updates ohne `useEffect`.
