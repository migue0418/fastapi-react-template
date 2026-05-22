import { useCallback, useEffect } from "react"

import { useBarcodeScanner } from "@/shared/hooks/useBarcodeScanner"
import { ModalDialog } from "@/shared/ui/ModalDialog"
import "./BarcodeScannerModal.css"

type BarcodeScannerModalProps = {
  open: boolean
  onDetected: (value: string) => void
  onClose: () => void
}

export function BarcodeScannerModal({ open, onDetected, onClose }: BarcodeScannerModalProps) {
  const handleDetected = useCallback(
    (value: string) => {
      onDetected(value)
      onClose()
    },
    [onDetected, onClose],
  )

  const { videoRef, error, start, stop } = useBarcodeScanner(handleDetected)

  useEffect(() => {
    if (open) {
      void start()
    } else {
      stop()
    }
  }, [open, start, stop])

  return (
    <ModalDialog open={open} title="Escanear código de barras" onClose={onClose} width={380}>
      <div className="scanner-video-wrap">
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: "100%", height: 300, objectFit: "cover", display: "block" }}
        />
      </div>
      {error && <p className="scanner-error">{error}</p>}
      {!error && (
        <p className="scanner-hint">Apunta la cámara al código de barras para leerlo automáticamente.</p>
      )}
    </ModalDialog>
  )
}
