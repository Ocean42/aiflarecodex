import { useEffect, useMemo, useState } from "react";
import { ModalDialog } from "./ModalDialog.js";

type Props = {
  label: string;
  badgeCount?: number;
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
  dialogTitle,
  renderContent,
  testId,
}: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const baseTestId = useMemo(
    () =>
      testId ??
      `topbar-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`,
    [label, testId],
  );

  useEffect(() => {
    if (open && badgeCount === 0) {
      setOpen(false);
    }
  }, [badgeCount, open]);

  return (
    <div className="top-bar-openable">
      <button
        type="button"
        className="top-bar-chip"
        aria-expanded={open}
        data-testid={`${baseTestId}-toggle`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="top-bar-chip-label">{label}</span>
        <span className="top-bar-badge" data-testid={`${baseTestId}-badge`}>
          {formatBadge(badgeCount)}
        </span>
      </button>
      <ModalDialog
        open={open}
        title={dialogTitle ?? label}
        onClose={() => setOpen(false)}
        testId={`${baseTestId}-modal`}
      >
        {renderContent()}
      </ModalDialog>
    </div>
  );
}
