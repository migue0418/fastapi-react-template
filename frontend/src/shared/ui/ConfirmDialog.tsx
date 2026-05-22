import type { ReactNode } from "react";

import { ModalDialog } from "@/shared/ui/ModalDialog";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <ModalDialog open={open} title={title} onClose={onClose} disableClose={isLoading} width={480}>
      <div className="ui-stack">
        <div className="ui-confirm-message">{message}</div>
        <div className="ui-modal-actions">
          <button type="button" className="ui-button" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="ui-button ui-button-danger"
            onClick={() => void onConfirm()}
            disabled={isLoading}
          >
            {isLoading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
