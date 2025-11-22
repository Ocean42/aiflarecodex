import { TopBarOpenableElement } from "./TopBarOpenableElement.js";

type Props = {
  brandText?: string;
  activeCliCount: number;
  logsCount: number;
  minimizedCount: number;
  renderClis(): JSX.Element;
  renderLogs(): JSX.Element;
  renderMinimizedSessions(): JSX.Element;
};

export function TopBar({
  brandText = "AgentMan",
  activeCliCount,
  logsCount,
  minimizedCount,
  renderClis,
  renderLogs,
  renderMinimizedSessions,
}: Props): JSX.Element {
  return (
    <header className="top-bar" data-testid="top-bar">
      <div className="top-bar-brand">
        <span className="brand-mark">A</span>
        <div className="brand-text">
          <span className="brand-title">{brandText}</span>
          <span className="brand-subtitle">Session Console</span>
        </div>
      </div>
      <div className="top-bar-actions">
        <TopBarOpenableElement
          label="CLIs"
          badgeCount={activeCliCount}
          dialogTitle="Connected CLIs"
          renderContent={renderClis}
          testId="topbar-clis"
        />
        <TopBarOpenableElement
          label="Minimized Sessions"
          badgeCount={minimizedCount}
          dialogTitle="Minimized Sessions"
          renderContent={renderMinimizedSessions}
          testId="topbar-minimized"
        />
        <TopBarOpenableElement
          label="Logs"
          badgeCount={logsCount}
          dialogTitle="Client Logs"
          renderContent={renderLogs}
          testId="topbar-logs"
        />
      </div>
    </header>
  );
}
