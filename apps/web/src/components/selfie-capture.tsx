"use client";

import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";

import { calmPrimaryButtonClass, calmSecondaryButtonClass } from "@/lib/calm-ui";

export type SelfieCaptureProps = {
  onPhotoReady: (jpegDataUrl: string) => void;
  disabled?: boolean;
};

/**
 * Front-camera capture for attendance verification. Emits a JPEG data URL on “Use this photo”.
 */
export function SelfieCapture({
  onPhotoReady,
  disabled = false
}: SelfieCaptureProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const stopStream = useCallback((): void => {
    setStream((prev) => {
      if (prev) {
        prev.getTracks().forEach((track) => {
          track.stop();
        });
      }
      return null;
    });
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || stream === null) {
      return;
    }
    el.srcObject = stream;
    void el.play().catch(() => {
      void 0;
    });
  }, [stream]);

  const startCamera = async (): Promise<void> => {
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      setStream(media);
      setCameraOpen(true);
      setPreviewUrl(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Camera unavailable";
      setError(message);
    }
  };

  const captureFrame = (): void => {
    const video = videoRef.current;
    if (video === null || video.videoWidth === 0) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (context === null) {
      return;
    }
    context.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    stopStream();
    setCameraOpen(false);
    setPreviewUrl(dataUrl);
  };

  const retakePreview = (): void => {
    setPreviewUrl(null);
    void startCamera();
  };

  const useThisPhoto = (): void => {
    if (previewUrl !== null) {
      onPhotoReady(previewUrl);
    }
  };

  const cancelCamera = (): void => {
    stopStream();
    setCameraOpen(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Take a clear selfie (face visible). This confirms you are present for the check-in. Use a
        private HTTPS connection; your browser will ask for camera access.
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {!cameraOpen && previewUrl === null ? (
        <button
          type="button"
          className={calmPrimaryButtonClass}
          disabled={disabled}
          onClick={() => {
            void startCamera();
          }}
        >
          Open camera
        </button>
      ) : null}
      {cameraOpen ? (
        <div className="space-y-2">
          <video
            ref={videoRef}
            playsInline
            muted
            className="aspect-video w-full max-w-md rounded-xl border border-border bg-black object-cover"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={calmPrimaryButtonClass}
              disabled={disabled}
              onClick={captureFrame}
            >
              Capture
            </button>
            <button
              type="button"
              className={calmSecondaryButtonClass}
              disabled={disabled}
              onClick={cancelCamera}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {previewUrl !== null ? (
        <div className="space-y-2">
          <img
            src={previewUrl}
            alt="Selfie preview"
            className="aspect-video w-full max-w-md rounded-xl border border-border object-cover"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={calmPrimaryButtonClass}
              disabled={disabled}
              onClick={useThisPhoto}
            >
              Use this photo
            </button>
            <button
              type="button"
              className={calmSecondaryButtonClass}
              disabled={disabled}
              onClick={retakePreview}
            >
              Retake
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
