import { useEffect, useState } from "react";
import type { AuthStatus } from "../types/auth.js";

type LoginTarget = { cliId: string; loginUrl?: string };

type Props = {
  status: AuthStatus | null;
  clis: Array<{ id: string; label: string }>;
  pendingLogins: Array<LoginTarget>;
  onLogin(cliId: string): Promise<void>;
  onLogout(): Promise<void>;
};

export function AuthPanel({
  status,
  clis,
  pendingLogins,
  onLogin,
  onLogout,
}: Props): JSX.Element {
  const loggedIn = status?.loggedIn ?? false;
  const [selectedCli, setSelectedCli] = useState<string>(() => clis[0]?.id ?? "");

  useEffect(() => {
    if (clis.length === 0) {
      setSelectedCli("");
      return;
    }
    if (!selectedCli || !clis.find((cli) => cli.id === selectedCli)) {
      setSelectedCli(clis[0]!.id);
    }
  }, [clis, selectedCli]);

  const handleLoginClick = (): void => {
    if (!selectedCli) {
      alert("Please select a CLI before requesting the login link.");
      return;
    }
    void onLogin(selectedCli);
  };

  return (
    <section aria-label="Codex Authentication">
      <h2>Codex Authentication</h2>
      {status ? (
        <>
          <p data-testid="auth-state">
            {loggedIn ? "Logged in to Codex" : "Not logged in"}
          </p>
          {status.lastLoginAt && (
            <p>Last login: {new Date(status.lastLoginAt).toLocaleString()}</p>
          )}
          {pendingLogins.length > 0 && (
            <div>
              <p>Pending login requests:</p>
              <ul>
                {pendingLogins.map((entry) => (
                  <li key={entry.cliId}>
                    {entry.cliId} – open the link shown in that CLI
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p>Loading authentication status…</p>
      )}
      <div className="auth-actions">
        {!loggedIn ? (
          <>
            <label>
              Target CLI:
              <select
                value={selectedCli}
                onChange={(event) => setSelectedCli(event.target.value)}
                disabled={clis.length === 0}
              >
                {clis.length === 0 && <option value="">No CLI registered</option>}
                {clis.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.label} ({cli.id})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!selectedCli}
              onClick={handleLoginClick}
            >
              Send login link to CLI
            </button>
          </>
        ) : (
          <button type="button" onClick={() => void onLogout()}>
            Log out of Codex
          </button>
        )}
      </div>
    </section>
  );
}
