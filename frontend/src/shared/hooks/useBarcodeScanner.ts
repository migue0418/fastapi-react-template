import { useCallback, useEffect, useRef, useState } from "react"
import { BarcodeDetectorPolyfill } from "@undecaf/barcode-detector-polyfill"

// Use native BarcodeDetector where available (Chrome/Android), polyfill elsewhere (iOS Safari/Chrome)
const DetectorClass: typeof BarcodeDetectorPolyfill =
  "BarcodeDetector" in globalThis
    ? (globalThis as unknown as { BarcodeDetector: typeof BarcodeDetectorPolyfill }).BarcodeDetector
    : BarcodeDetectorPolyfill

const DESIRED_FORMATS = [
  "ean_13",
  "ean_8",
  "code_128",
  "code_39",
  "code_93",
  "upc_a",
  "upc_e",
  "qr_code",
  "data_matrix",
]

export function useBarcodeScanner(onDetected: (value: string) => void) {
  const videoRef     = useRef<HTMLVideoElement | null>(null)
  const streamRef    = useRef<MediaStream | null>(null)
  const detectorRef  = useRef<InstanceType<typeof BarcodeDetectorPolyfill> | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const lastValueRef = useRef<string | null>(null)
  const scanPauseRef = useRef(false)

  const [active, setActive] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      // Filter against supported formats to avoid "Unsupported barcode format" error on iOS
      const supported = await DetectorClass.getSupportedFormats()
      detectorRef.current = new DetectorClass({
        formats: DESIRED_FORMATS.filter((f) => supported.includes(f)),
      })
      setActive(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo acceder a la cámara.")
    }
  }, [])

  const stop = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }, [])

  useEffect(() => {
    if (!active || !videoRef.current || !detectorRef.current) return

    const video    = videoRef.current
    const detector = detectorRef.current

    const scan = async () => {
      if (!active || scanPauseRef.current) {
        animFrameRef.current = requestAnimationFrame(scan)
        return
      }
      try {
        const results = await detector.detect(video)
        if (results.length > 0) {
          const val = results[0].rawValue
          if (val !== lastValueRef.current) {
            lastValueRef.current = val
            onDetected(val)
            scanPauseRef.current = true
            setTimeout(() => {
              scanPauseRef.current = false
              lastValueRef.current = null
            }, 1500)
          }
        }
      } catch {
        // Frame not ready yet — ignore silently
      }
      animFrameRef.current = requestAnimationFrame(scan)
    }

    animFrameRef.current = requestAnimationFrame(scan)

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
    }
  }, [active, onDetected])

  // Clean up stream on unmount
  useEffect(() => () => stop(), [stop])

  return { videoRef, active, error, start, stop }
}
