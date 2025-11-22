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
    <section aria-label="Codex Authentication" className="auth-card">
      <header className="auth-card-header">
        <span className="auth-title">Codex Auth</span>
        <span
          className={`auth-status ${loggedIn ? "auth-status-ok" : "auth-status-warn"}`}
          data-testid="auth-state"
        >
          {loggedIn ? "Logged in" : "Not logged in"}
        </span>
      </header>
      <div className="auth-body">
        {status?.lastLoginAt ? (
          <span className="auth-subtle">
            Last login: {new Date(status.lastLoginAt).toLocaleString()}
          </span>
        ) : (
          <span className="auth-subtle">Checking authentication…</span>
        )}
        {pendingLogins.length > 0 && (
          <span className="auth-subtle">
            Pending: {pendingLogins.map((entry) => entry.cliId).join(", ")}
          </span>
        )}
      </div>
      <div className="auth-actions">
        {!loggedIn ? (
          <>
            <label className="auth-label">
              Target CLI
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
              className="auth-button"
              disabled={!selectedCli}
              onClick={handleLoginClick}
            >
              Send login link
            </button>
          </>
        ) : (
          <button
            type="button"
            className="auth-button auth-button-secondary"
            onClick={() => void onLogout()}
          >
            Log out
          </button>
        )}
      </div>
    </section>
  );
}
