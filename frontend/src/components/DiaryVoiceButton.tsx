"use client";

import { Loader2, Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type DiaryVoiceButtonProps = {
  apiBase: string;
  /** Row index for coordinating one active recording across many fields. */
  fieldIndex: number;
  /** When another field holds the voice session, this mic is disabled. */
  sessionOwnerIndex: number | null;
  onSessionOwnerChange: (index: number | null) => void;
  disabled?: boolean;
  onTranscript: (text: string) => void;
  ariaLabel?: string;
};

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  if (typeof MediaRecorder === "undefined") return "";
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

function extensionForMime(mime: string): string {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("webm")) return "webm";
  return "webm";
}

export default function DiaryVoiceButton({
  apiBase,
  fieldIndex,
  sessionOwnerIndex,
  onSessionOwnerChange,
  disabled = false,
  onTranscript,
  ariaLabel = "Speak to fill text with voice",
}: DiaryVoiceButtonProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>("");
  const claimedSessionRef = useRef(false);

  const micLockedOut = sessionOwnerIndex !== null && sessionOwnerIndex !== fieldIndex;

  useEffect(() => {
    return () => {
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (claimedSessionRef.current) {
        claimedSessionRef.current = false;
        onSessionOwnerChange(null);
      }
    };
  }, [onSessionOwnerChange]);

  const uploadBlob = useCallback(
    async (blob: Blob, filename: string) => {
      setUploading(true);
      setError(null);
      try {
        const fd = new FormData();
        fd.append("file", blob, filename);
        const res = await fetch(`${apiBase}/api/v1/speech/transcribe`, {
          method: "POST",
          body: fd,
        });
        const data = (await res.json().catch(() => ({}))) as { detail?: string; text?: string };
        if (!res.ok) {
          throw new Error(typeof data.detail === "string" ? data.detail : "Transcription failed");
        }
        const text = (data.text ?? "").trim();
        if (!text) {
          throw new Error("No speech detected. Try again a little closer to the mic.");
        }
        onTranscript(text);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Could not transcribe audio");
      } finally {
        setUploading(false);
        claimedSessionRef.current = false;
        onSessionOwnerChange(null);
      }
    },
    [apiBase, onTranscript, onSessionOwnerChange]
  );

  const stopAndSend = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || uploading || micLockedOut) return;
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice input is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = pickMimeType();
      mimeRef.current = mimeType;
      const options = mimeType ? { mimeType } : undefined;
      const rec = new MediaRecorder(stream, options);
      recorderRef.current = rec;
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const mime = rec.mimeType || mimeRef.current || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        const ext = extensionForMime(mime);
        void uploadBlob(blob, `recording.${ext}`);
      };
      onSessionOwnerChange(fieldIndex);
      claimedSessionRef.current = true;
      rec.start(250);
      setRecording(true);
    } catch {
      setError("Microphone permission is required for voice input.");
      claimedSessionRef.current = false;
      onSessionOwnerChange(null);
    }
  }, [disabled, uploading, micLockedOut, fieldIndex, uploadBlob, onSessionOwnerChange]);

  const icon = uploading ? (
    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
  ) : recording ? (
    <Square className="h-4 w-4 fill-current" aria-hidden />
  ) : (
    <Mic className="h-5 w-5" aria-hidden />
  );

  const micDisabled = disabled || uploading || micLockedOut;

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        disabled={micDisabled}
        onClick={recording ? stopAndSend : startRecording}
        title={recording ? "Stop and transcribe" : "Speak to type"}
        aria-label={recording ? "Stop recording and transcribe" : ariaLabel}
        aria-pressed={recording}
        className={`flex h-10 w-10 items-center justify-center rounded-lg border bg-midnight-light transition hover:bg-midnight-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunburst disabled:cursor-not-allowed disabled:opacity-50 ${
          recording
            ? "border-red-400/80 text-red-300 hover:border-red-400"
            : "border-sunburst/70 text-sunburst hover:border-sunburst"
        }`}
      >
        {icon}
      </button>
      {error && <p className="max-w-[10rem] text-center text-[10px] leading-tight text-red-400">{error}</p>}
    </div>
  );
}
