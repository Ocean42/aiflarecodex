import { ModalDialog } from "./ModalDialog.js";
import { useLocalState } from "../hooks/useLocalState.js";

type Props = {
  label: string;
  badgeCount?: number;
  badgeLabel?: string;
  badgeStatus?: "ok" | "warn";
  dialogTitle?: string;
  testId?: string;
  renderContent(): JSX.Element;
};

function formatBadge(count: number): string {
  if (count > 99) {
    return "99+";
  }
  if (count < 0) {
    return "0";
  }
  return String(count);
}

export function TopBarOpenableElement({
  label,
  badgeCount = 0,
  badgeLabel,
  badgeStatus,
  dialogTitle,
  renderContent,
  testId,
}: Props): JSX.Element {
  const [state, , reRender] = useLocalState<{ open: boolean }>(({ self }) => ({
    ...self,
    open: false,
  }));
  const baseTestId =
    testId ??
    `topbar-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`;

  return (
    <div className="top-bar-openable">
      <button
        type="button"
        className="top-bar-chip"
        aria-expanded={state.open}
        data-testid={`${baseTestId}-toggle`}
        onClick={() => {
          state.open = !state.open;
          reRender();
        }}
      >
        <span className="top-bar-chip-label">{label}</span>
        <span
          className="top-bar-badge"
          data-testid={`${baseTestId}-badge`}
          data-status={badgeStatus}
        >
          {badgeLabel ?? formatBadge(badgeCount)}
        </span>
      </button>
      <ModalDialog
        open={state.open}
        title={dialogTitle ?? label}
        onClose={() => {
          state.open = false;
          reRender();
        }}
        testId={`${baseTestId}-modal`}
      >
        {renderContent()}
      </ModalDialog>
    </div>
  );
}
