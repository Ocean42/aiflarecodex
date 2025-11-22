import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose(): void;
  testId?: string;
};

export function ModalDialog({
  open,
  title,
  children,
  onClose,
  testId,
}: Props): JSX.Element | null {
  const headingId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="presentation"
      data-testid={testId}
    >
      <div
        className="modal-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? headingId : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          {title ? <h2 id={headingId}>{title}</h2> : <span />}
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="modal-content">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
