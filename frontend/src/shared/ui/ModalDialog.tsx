import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type ModalDialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  disableClose?: boolean;
  width?: number;
};

export function ModalDialog({
  open,
  title,
  children,
  onClose,
  disableClose = false,
  width = 620,
}: ModalDialogProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    containerRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !disableClose) {
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first || document.activeElement === container) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [disableClose, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="ui-modal-backdrop"
      onMouseDown={(event) => {
        if (!disableClose && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-modal-title"
        className="ui-modal"
        style={{ width: `min(${width}px, calc(100vw - 2rem))` }}
      >
        <div className="ui-modal-header">
          <h2 id="ui-modal-title">{title}</h2>
          <button
            type="button"
            className="ui-modal-close"
            onClick={onClose}
            disabled={disableClose}
            aria-label="Cerrar"
          >
            <span aria-hidden="true">x</span>
          </button>
        </div>
        <div className="ui-modal-body">{children}</div>
      </div>
    </div>
  );
}
