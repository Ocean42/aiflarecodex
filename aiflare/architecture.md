# Aiflare Backend-Neuarchitektur (Variante 2 nach Rust-Vorbild)

Dieses Dokument beschreibt im Detail, was nötig ist, um die TypeScript‑Variante (`aiflare`) so umzubauen, dass sie sich **funktional** wie die Rust‑Implementierung (`codex-rs`) verhält – mit React/Ink als UI, aber mit denselben Backend‑Flows für Login, Auth, Usage/Rate‑Limiting und (optional) App‑Server‑Integration.

Aktuell haben wir bereits:

- Auth‑Speicher in `~/.codey/auth.json` analog zur Rust‑Variante, aber mit eigenem Home.
- Einen TypeScript‑Port des `codex-backend-client` für Usage/Rate‑Limits und `/status`.

Dieses Dokument geht weiter und beschreibt, was alles zu tun wäre, um das **gesamte Backend‑/Core‑Verhalten** der Rust‑CLI in TypeScript nachzubauen. Es ist bewusst als Plan/Architektur‑Spec geschrieben, nicht als fertige Implementierung.

---

## 0. Zielbild (Variante 2)

Wir wollen, dass die TypeScript‑CLI (`aiflare`) sich wie folgt verhält:

1. **Auth & Credentials**
   - Authentifizierung läuft über denselben ChatGPT/OIDC‑Flow wie in Rust.
   - Tokens (`id_token`, `access_token`, `refresh_token`, `account_id`) und `OPENAI_API_KEY` werden in `~/.codey/auth.json` im gleichen Format wie in Rust (aber unter eigenem Verzeichnis) persistiert.
   - Ein einheitlicher Auth‑Layer (TS‑Äquivalent zum Rust‑`AuthManager`) liefert bei Bedarf:
     - Access‑Token für das ChatGPT/Codex‑Backend.
     - API‑Key für direkte OpenAI‑Requests.
     - Zusatzinfos (Plan‑Typ, Account‑ID etc.) für Status/Usage.

2. **Model‑Provider & Wire‑APIs**
   - Model‑Aufrufe werden nicht mehr „ad hoc“ in der CLI kodiert, sondern über eine zentrale Provider‑Konfiguration (TS‑Gegenstück zu `ModelProviderInfo`), die u. a. bestimmt:
     - Basis‑URL (`base_url`),
     - genutztes Wire‑API (`responses`, `chat-completions`, ggf. `codex-backend`),
     - Header (z. B. `Authorization`),
     - Timeouts, Retry‑Strategien.

3. **Core‑Schicht / Agent**
   - Anstatt direkt `openai.responses.create`/`chat.completions.create` aufzurufen, gibt es eine Core‑Schicht (TS‑Pendant zu `codex-rs/core`), die:
     - den Prompt‑/Turn‑Zustand hält (Input, Tools, Kontext),
     - Requests für das passende Wire‑API baut,
     - Streaming‑Events (`ResponseEvent`/`TurnItem`‑Äquivalent) erzeugt,
     - Token‑Usage & RateLimits einsammelt und an die UI weiterreicht.

4. **Usage & Rate‑Limits**
   - Wie im Rust‑Client:
     - ein dedizierter Backend‑Client fragt `/api/codex/usage` oder `/wham/usage` ab,
     - aus dem JSON‑Payload wird ein `RateLimitSnapshot` gebaut (primary/secondary Fenster, `% used`, `reset_at`),
     - `/status` zeigt diese Snapshots im React‑UI an.

5. **Status & Debugging**
   - `/status` soll auf Basis der realen Backend‑Daten zeigen:
     - Model, Provider, Approval‑Mode, Sandbox‑Policy (TS‑Äquivalent),
     - Account‑Info (ChatGPT vs. API‑Key, Plan‑Typ),
     - Token‑Usage (optional),
     - Rate‑Limits (primary/secondary, % left, Reset‑Zeitpunkt),
     - Zeithinweis „Daten evtl. veraltet“ (wenn Snapshot zu alt ist).

6. **Rendering**
   - Das Rendering bleibt React/Ink – nur die Datenbasis und der Fluss der Events werden an Rust angeglichen.

---

## 1. Auth-Schicht wie in Rust nachbauen

Rust:

- `codex-rs/core/src/auth/storage.rs`
  - `AuthDotJson` (`OPENAI_API_KEY`, `tokens`, `last_refresh`).
  - `TokenData` (`id_token`, `access_token`, `refresh_token`, `account_id`).
  - `AuthCredentialsStoreMode` (File, Keyring, Auto).
  - Storage‑Backends (Datei vs. Keyring) + Hilfsfunktionen `login_with_api_key`, `save_auth`, `load_auth_dot_json`.

- `codex-rs/core/src/token_data.rs`
  - `parse_id_token(id_token) -> IdTokenInfo` (parst JWT, extrahiert Email, `chatgpt_plan_type`, `chatgpt_account_id`).

### 1.1. TS-Auth-Modelle definieren

**Ziel**: Eine TS‑Struktur, die 1:1 zu `AuthDotJson`/`TokenData` passt, damit wir:

- auth.json lesen,
- Token‑Infos rekonstruieren,
- und sie sowohl für OpenAI‑SDK als auch Backend‑Client nutzen können.

**To‑Dos:**

1. `src/backend/authModel.ts` einführen:
   - `interface IdTokenInfo {
       email?: string;
       chatgptPlanType?: string;
       chatgptAccountId?: string;
       rawJwt: string;
     }`
   - `interface TokenData {
       idToken: IdTokenInfo;
       accessToken: string;
       refreshToken: string;
       accountId?: string;
     }`
   - `interface AuthDotJson {
       OPENAI_API_KEY?: string;
       tokens?: TokenData;
       last_refresh?: string;
     }`

2. `parseIdToken(id_token: string): IdTokenInfo` implementieren:
   - analog zu `parse_id_token` in Rust:
     - Split in 3 Teile (`header.payload.signature`).
     - Base64url‑Decode des Payloads.
     - JSON‑Parse → Claims:
       - `email?`,
       - `https://api.openai.com/auth.chatgpt_plan_type?`,
       - `https://api.openai.com/auth.chatgpt_account_id?`.
     - `rawJwt` = originaler String.

3. `loadAuthDotJson(): Promise<AuthDotJson | null>`:
   - aus `~/.codey/auth.json` lesen,
   - minimal validieren (JSON‑Parse),
   - optional TokenData aus `tokens`‐Raw aus der bestehenden TS‑Struktur migrieren (falls alt).

4. `saveAuthDotJson(auth: AuthDotJson): Promise<void>`:
   - JSON pretty‑printen und mit Mode `0o600` nach `~/.codey/auth.json` schreiben.

### 1.2. Login-Flow in get-api-key.tsx anpassen

**Ziel**: Der Login‑Flow soll dieselben Daten in `auth.json` persistieren, wie sie Rust erwartet.

Aktuell (TS):

- `handleCallback` schreibt:

  ```ts
  const authData = {
    tokens: tokenData,
    last_refresh: new Date().toISOString(),
    OPENAI_API_KEY: exchanged.access_token,
  };
  ```

**Zu tun:**

1. `tokenData` in eine `TokenData`‑Struktur konvertieren:
   - `id_token` → `IdTokenInfo` via `parseIdToken`.
   - `access_token`, `refresh_token` übernehmen.
   - `account_id` aus Claims (`chatgpt_account_id`) übernehmen.

2. `authData` beim Login so schreiben:

   ```ts
   const idTokenInfo = parseIdToken(tokenData.id_token);

   const authData: AuthDotJson = {
     OPENAI_API_KEY: exchanged.access_token,
     tokens: {
       idToken: idTokenInfo,
       accessToken: tokenData.access_token,
       refreshToken: tokenData.refresh_token,
       accountId: idTokenInfo.chatgptAccountId,
     },
     last_refresh: new Date().toISOString(),
   };
   await saveAuthDotJson(authData);
   ```

3. Falls noch `auth.json`‑Altformate existieren:
   - `loadAuthDotJson` sollte robust sein: wenn `tokens.id_token` ein String ist, `parseIdToken` nachträglich ausführen.

### 1.3. API-Key und Backend-Token für den Rest der CLI bereitstellen

**Ziel**: Einen zentralen „AuthManager“-ähnlichen Helper in TS, der:

- `getOpenaiApiKey()` liefert (für das OpenAI‑SDK).
- `getBackendAuth()` liefert:
  - `baseUrl` (ChatGPT‑Backend),
  - `accessToken`,
  - `accountId`.

**To‑Dos:**

1. `src/backend/authManager.ts`:

   ```ts
   export interface BackendAuth {
     baseUrl: string;
     accessToken: string;
     accountId?: string;
   }

   export async function getBackendAuth(): Promise<BackendAuth | null> {
     const auth = await loadAuthDotJson();
     if (!auth?.tokens) return null;
     const baseUrl = getChatgptBaseUrl();
     return {
       baseUrl,
       accessToken: auth.tokens.accessToken,
       accountId: auth.tokens.accountId,
     };
   }

   export async function getOpenaiApiKey(): Promise<string | null> {
     const auth = await loadAuthDotJson();
     if (auth?.OPENAI_API_KEY && auth.OPENAI_API_KEY.trim() !== "") {
       return auth.OPENAI_API_KEY.trim();
     }
     return null;
   }
   ```

2. `src/utils/config.ts` anpassen:
   - `getApiKey(provider)` sollte bevorzugt `getOpenaiApiKey()` nutzen (nur für `openai`‑Provider).

---

## 2. Provider- und Wire-API-Schicht nach Rust-Vorbild

Rust:

- `core/src/model_provider_info.rs`:
  - `ModelProviderInfo`:
    - `name`, `base_url`, `env_key`, `wire_api`, `http_headers`, `env_http_headers`, Retry‑Settings, `requires_openai_auth`.
  - `WireApi`:
    - `Responses`, `Chat`, etc.
  - `create_request_builder()`:
    - baut einen `CodexHttpClient`‑Request inkl. aller Header/Token.

### 2.1. TS-Providerinfo definieren

**Ziel**: Eine zentrale TS‑Definition für Provider, damit der Agent‑Loop nicht mehr direkt URLs/Clients baut.

To‑Dos:

1. `src/backend/modelProvider.ts`:

   ```ts
   export type WireApi = "responses" | "chat-completions";

   export interface ModelProviderInfo {
     name: string;
     baseUrl?: string;
     envKey?: string;
     experimentalBearerToken?: string;
     wireApi: WireApi;
     httpHeaders?: Record<string, string>;
     envHttpHeaders?: Record<string, string>;
     requestMaxRetries?: number;
     streamMaxRetries?: number;
     streamIdleTimeoutMs?: number;
     requiresOpenaiAuth?: boolean;
   }
   ```

2. Provider‑Konfiguration aus `config.json`/`config.yaml` erweitern:
   - analog zu Rusts `model_providers` im Config‑Modul.

### 2.2. Zentralen HTTP-Client in TS bauen

**Ziel**: Äquivalent zu Rusts `CodexHttpClient`, der:

- Basis‑URL,
- Timeout,
- Retries,
- Header‑Logik,

kapselt und vom Rest der CLI genutzt wird.

To‑Dos:

1. `src/backend/httpClient.ts`:
   - Wrapper um `fetch` mit:
     - Basis‑URL,
     - Timeout (AbortController),
     - Retry‑Logik (HTTP‑Status, Timeout/Network‑Errors),
     - Request‑Builder (GET/POST mit JSON‑Body).
   - Diese Schicht wird sowohl vom „Model‑Client“ als auch vom `BackendClient` genutzt.

2. Adapter für OpenAI‑SDK:
   - Optional: Das OpenAI‑SDK kann weiterhin benutzt werden; der HTTP‑Client sollte aber zumindest dieselben Header/Timeouts verwenden (über `defaultHeaders`/`timeout`).

---

## 3. Core-Schicht / Agent nach Rust portieren (Konzept)

Rust:

- `core/src/codex.rs`:
  - hält Session‑State, Kontextverlauf, Tools, etc.
  - orchestriert `Prompt`, Requests, Streaming‑Events (`ResponseEvent`).

- `core/src/client_common.rs`:
  - `Prompt` (Input + Tools),
  - `ResponsesApiRequest`,
  - `ResponseEvent` (Created, OutputItemAdded, OutputItemDone, Completed, RateLimits, Reasoning‑Deltas, …).

TS:

- `src/utils/agent/agent-loop.ts` übernimmt derzeit diese Aufgaben, aber:
  - arbeitet direkt mit dem OpenAI‑SDK,
  - hat eigene Error/Retry‑Logik,
  - kennt kein „RateLimits“‑Event aus dem Backend.

### 3.1. ResponseEvent-Typen synchronisieren

**Ziel**: Einen TS‑`ResponseEvent`‑Typ bauen, der dem Rust‑Enum entspricht, sodass UI & Agent dieselben semantischen Events sehen.

To‑Dos:

1. `src/backend/responseEvents.ts`:

   ```ts
   export type ResponseEvent =
     | { type: "created" }
     | { type: "output_item_added"; item: ResponseItem }
     | { type: "output_item_done"; item: ResponseItem }
     | { type: "completed"; responseId: string; tokenUsage?: TokenUsage }
     | { type: "output_text_delta"; delta: string }
     | { type: "reasoning_summary_delta"; delta: string; summaryIndex: number }
     | { type: "reasoning_content_delta"; delta: string; contentIndex: number }
     | { type: "reasoning_summary_part_added"; summaryIndex: number }
     | { type: "rate_limits"; snapshot: RateLimitSnapshot };
   ```

2. `TokenUsage` in TS definieren (analog zu `codex-rs/protocol::TokenUsage`), falls du später Token‑Infos brauchst.

3. `AgentLoop` so anpassen, dass er statt `log(JSON.stringify(item))` klar typisierte `ResponseEvent`s emittiert, die dann vom UI konsumiert werden.

### 3.2. Model-Aufrufe über zentrale „ModelClient“-Abstraktion

**Ziel**: Ein TS‑Äquivalent zu Rusts `ModelClient`/`ClientCommon`, das:

- aus einem `Prompt` + Provider‑Info einen Request baut,
- abhängig von `wire_api`:
  - `responses.create(...)` oder
  - `chat.completions.create(...)`
  nutzt,
- und einen `AsyncIterable<ResponseEvent>` zurückliefert.

To‑Dos:

1. `src/backend/prompt.ts`:
   - TS‑Version von `Prompt`:
     - `input: ResponseItem[]`,
     - `tools: ToolSpec[]` (TS‑Tool‑Modell analog zu Rust),
     - `parallelToolCalls: boolean`,
     - `baseInstructionsOverride?: string`,
     - `outputSchema?: unknown`.

2. `src/backend/modelClient.ts`:
   - `createResponsesRequest(prompt, modelConfig, config) → RequestPayload` (analog `ResponsesApiRequest`).
   - `runResponsesTurn(openaiClient, payload) → AsyncIterable<ResponseEvent>`:
     - `responses.create({ ...payload, stream: true })`,
     - aus dem Stream `ResponseEvent`s generieren.
   - `runChatCompletionsTurn(openaiClient, payload) → AsyncIterable<ResponseEvent>`:
     - `chat.completions.create({ ...store, stream: true })`,
     - per `responsesCreateViaChatCompletions` abbilden (so wie bestehender Code es macht).

3. `AgentLoop` so umbauen, dass er:
   - `Prompt` erzeugt,
   - `ModelClient.runTurn` aufruft,
   - Events konsumiert und in UI‑`ResponseItem`s übersetzt.

> Wichtig: Hier ist kein echter „Codex‑Backend‑Model‑Proxy“ im Spiel – auch Rust geht für Modelle direkt gegen OpenAI/Provider. Der Unterschied ist, dass der Pfad in Rust über eine klar strukturierte „Core“-Schicht und `ResponseEvent`s läuft und nicht quer durch die TUI/CLI verdrahtet ist. Diesen Aufbau portieren wir in TS.

---

## 4. Usage & Rate-Limits im Status (TS-Implementierung basiert bereits auf Rust)

Dieser Teil ist im TS‑Code bereits umgesetzt, aber hier nochmal als Referenz, was zu tun war/ist:

1. **RateLimitSnapshot‑Typen** – `src/backend/rateLimitTypes.ts`
   - `RateLimitStatusPayload`, `RateLimitStatusDetails`, `RateLimitWindowSnapshot` (OpenAPI‑Port).
   - `RateLimitWindow`, `RateLimitSnapshot` (CLI‑freundlich).
   - `rateLimitSnapshotFromPayload`, `mapRateLimitWindow`, `windowMinutesFromSeconds` (Rust‑Logik portiert).

2. **BackendClient** – `src/backend/client.ts`
   - `baseUrl` normalisiert, `pathStyle` bestimmt (`codexApi` vs. `chatGptApi`).
   - `getRateLimits()` ruft `GET /api/codex/usage` oder `/wham/usage` auf.
   - Dekodiert JSON → `RateLimitStatusPayload` → `RateLimitSnapshot`.

3. **Status‑Helper** – `src/backend/status.ts`
   - `fetchBackendRateLimits()`:
     - `loadAuthTokens()` aus `auth.json`,
     - `BackendClient` instanziieren,
     - `getRateLimits()` aufrufen,
     - Snapshot + Fehlermeldung für `/status` bereitstellen.

4. **React-/Ink-Status** – `src/components/chat/terminal-chat.tsx`
   - `onStatus`‑Handler:
     - Basisinfos (Version, Model, Provider, Approval, PWD, Kontext).
     - `fetchBackendRateLimits()` aufrufen.
     - Primary/Secondary‑Fenster als Textzeilen:
       - „Primary (5m limit): 80% left (resets 13:42)“,
       - „Secondary (weekly limit): 60% left (resets 03:10)“.
     - Hinweis auf `https://chatgpt.com/codex/settings/usage`.

In diesem Bereich ist TS bereits funktional auf dem Stand der Rust‑TUI, nur mit Text statt ratatui‑Card.

---

## 5. Zusammenfassung der Schritte

Um „Variante 2“ vollständig umzusetzen (Rust‑Backend‑Verhalten mit React‑Render), sind im Wesentlichen folgende Blöcke nötig:

1. **Auth-Schicht nach Rust‑Vorbild**
   - `AuthDotJson`, `TokenData`, `IdTokenInfo` als TS‑Modelle definieren.
   - `parseIdToken` implementieren.
   - Login‑Flow so anpassen, dass genau diese Struktur in `auth.json` landet.
   - Helper `getBackendAuth`/`getOpenaiApiKey` bauen.

2. **Provider- & HTTP-Schicht**
   - `ModelProviderInfo` (TS) + `WireApi` definieren.
   - Zentralen HTTP‑Client bauen (`fetch`‑Wrapper mit Timeout, Retries, Headern).
   - OpenAI‑SDK‑Nutzung an diese Provider‑/HTTP‑Konfiguration anbinden (statt hartkodierter Aufrufe).

3. **Core/Agent-Schicht harmonisieren**
   - `ResponseEvent`‑Typen nach Rust‑Schema definieren.
   - `Prompt`‑Struktur in TS einführen.
   - `ModelClient` implementieren (Responses/ChatCompletions) → `AsyncIterable<ResponseEvent>`.
   - `AgentLoop` so umbauen, dass er **nur** noch mit `Prompt`, `ResponseEvent` und Provider‑Info arbeitet, nicht direkt mit einzelnen SDK‑Calls.

4. **Usage/Rate-Limits**
   - (bereits erledigt) TS‑Port der Rate‑Limit‑Backend‑Modelle + `BackendClient`.
   - `/status` nutzt `BackendClient.getRateLimits()` und rendert die Daten.

5. **Status/Debugging**
   - `/status` um Account/Plan‑Info erweitern (aus `IdTokenInfo`).
   - Optional: Token‑Usage in TS sammeln (ähnlich `TokenUsageInfo` in Rust) und mit anzeigen.

6. **Tests & Migration**
   - Schrittweise Migration:
     - Zuerst Auth/Backend‑Usage (bereits passiert).
     - Dann Provider‑/HTTP‑Schicht (minimal invasiv).
     - Dann `AgentLoop` auf `ModelClient`/`ResponseEvent` umstellen.
   - Bestehende Vitest‑Tests nutzen, um Verhalten stabil zu halten.

---

## 6. Teststrategie und Codex-Test-Harness

Da das Ziel ist, dass **möglichst viel gegen das echte Codex-/ChatGPT‑Backend getestet wird**, brauchen wir einen klaren Test‑Ansatz, der:

- Unit‑Tests ohne Netzwerk ermöglicht (schnell, deterministisch),
- aber zusätzlich einen dedizierten **Codex-Test-Harness** bereitstellt, über den Live‑Tests gegen die echte API laufen können – ohne dass jede einzelne Testdatei eigene Netzwerk‑/Auth‑Logik enthält.

### 6.1. Unit-Tests (ohne Netzwerk)

Für alle „inneren“ Bausteine bleiben klassische Unit‑Tests wichtig:

- `parseIdToken` – JWT‑Parsing und Claim‑Extraction.
- Rate‑Limit‑Mapping:
  - `rateLimitSnapshotFromPayload`,
  - `windowMinutesFromSeconds`.
- Provider‑Modell:
  - `ModelProviderInfo`‑Auswertung (Base‑URL, Header, Wire‑API).
- `AgentLoop` mit gemocktem `ModelClient` (Fake‑Streams von `ResponseEvent`s).

Diese Tests laufen ohne Netz und können in CI jederzeit ausgeführt werden.

### 6.2. Codex-Test-Harness (Integrationsebene)

Statt einzelne Tests direkt mit OpenAI‑Keys und URLs auszustatten, bündeln wir alle Live‑Interaktionen in einem **Test-Harness**, der als „Codex‑Test‑Client“ fungiert.

**Idee:**

- Ein kleines Hilfsprogramm/Modul (z. B. `aiflare/test-harness/codexTestClient.ts`), das:
  - sich über den normalen Login‑Flow (`codey --login` / ChatGPT‑Login) mit Codex verbindet,
  - `auth.json` liest und intern `BackendAuth` + OpenAI‑API‑Key bereitstellt,
  - eine wohldefinierte API anbietet, z. B.:
    - `runTurn(prompt: string, options) → { events: ResponseEvent[] }`
    - `getUsage() → RateLimitSnapshot`
    - `getAccountInfo() → { planType, email, accountId }`
  - intern die bereits gebauten Bausteine nutzt:
    - `getBackendAuth` / `BackendClient`,
    - `AgentLoop` / `ModelClient`.

**Integration in Tests:**

- Live‑Tests importieren **nur** den Test‑Client, z. B.:

  ```ts
  import { codexTestClient } from "../test-harness/codexTestClient";

  test("status reflects live rate limits", async () => {
    const usage = await codexTestClient.getUsage();
    expect(usage.primary || usage.secondary).not.toBeNull();
  });
  ```

- Der Test‑Client entscheidet selbst:
  - ob `auth.json` vorhanden ist,
  - ob alle nötigen Felder gefüllt sind,
  - gegen welche Base‑URL er spricht (`CHATGPT_BASE_URL`/Config),
  - ob ggf. Fehlermeldungen ausgegeben werden müssen („bitte erst codey --login ausführen“).

So entsteht **eine zentrale Stelle**, an der:

- Login‑/Auth‑Aspekte für Tests zusammenlaufen,
- die reale Codex‑/ChatGPT‑Integration gekapselt ist,
- und Live‑Tests „realistisch“ gegen das System arbeiten, ohne überall eigene Netzwerk‑Stubs.

### 6.3. Umfang der Live-Tests

Mit dem Codex‑Test‑Client können viele Tests bewusst live sein, z. B.:

- `/status`‑Tests:
  - Erwartung, dass Rate‑Limit‑Fenster sinnvoll gesetzt sind.
  - Abgleich, dass Formatierung von `% left` und Reset‑Zeit konsistent bleibt.
- End‑to‑End‑Agent‑Tests:
  - kurzer Prompt („say hello“, „add 1+1“) → überprüfen, dass zumindest ein Assistant‑Item im Event‑Strom erscheint.
- Auth‑Tests:
  - Testen, dass nach Login `auth.json` den erwarteten Aufbau hat,
  - dass `getBackendAuth` → `BackendAuth` zurückgibt, der echte Requests erlaubt.

Ob diese Live‑Tests in CI laufen oder nur lokal, hängt von deiner Umgebung und der Verfügbarkeit von Test‑Credentials ab. Wichtig ist: durch den zentralen Test‑Client musst du das nur **an einer Stelle** konfigurieren; alle Tests profitieren davon.



Dieses Dokument soll dir als „Blaupause“ dienen, was alles getan werden muss, um das Rust‑Backend‑Verhalten wirklich 1:1 in TypeScript zu spiegeln – die einzelnen Blöcke können dann iterativ implementiert und jeweils mit Tests abgesichert werden. 
