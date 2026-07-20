"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Ranked by quality + compatibility. Safari 14.1+ supports audio/mp4 (AAC)
// but not audio/webm, so mp4 candidates appear as fallbacks after webm.
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return ""; // let the browser decide
}

// Hard cap so a forgotten-open recording doesn't run (and upload) forever.
const MAX_RECORDING_SECONDS = 180;

export function useMediaRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Release mic and timer on unmount regardless of recording state.
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      releaseStream();
    };
  }, []);

  function releaseStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    setIsRecording(false);

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop(); // triggers onstop → assembles blob
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setRecordingSeconds(0);

    // Requires a secure context (HTTPS or localhost).
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Audio recording requires a secure connection (HTTPS). " +
          "Please open this page over HTTPS."
      );
      return;
    }

    // ── 1. Request microphone access ────────────────────────────────────────
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError(
          "Microphone access was denied. " +
            "Please allow microphone access in your browser settings and try again."
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("No microphone found. Please connect a microphone and try again.");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setError(
          "Microphone is in use by another application. " +
            "Please close the other app and try again."
        );
      } else {
        setError(`Microphone error (${name || "unknown"}): ${err.message || "Could not start recording."}`);
      }
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    // ── 2. Create MediaRecorder with best supported format ──────────────────
    const mimeType = pickMimeType();
    let recorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (err) {
      releaseStream();
      setError("MediaRecorder is not supported in this browser. Try Chrome or Firefox.");
      return;
    }

    // ── 3. Wire up event handlers ───────────────────────────────────────────
    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      // Use the recorder's actual mimeType (may differ from the requested one).
      const type = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      setAudioBlob(blob);
      releaseStream();
    };

    recorder.onerror = (e) => {
      clearInterval(timerRef.current);
      setIsRecording(false);
      releaseStream();
      setError(`Recording error: ${e.error?.message ?? "Unknown error. Please try again."}`);
    };

    recorderRef.current = recorder;

    // timeslice=250ms: flush chunks frequently so onstop gets complete data
    // even if the tab is backgrounded on mobile.
    recorder.start(250);
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setRecordingSeconds((s) => {
        const next = s + 1;
        if (next >= MAX_RECORDING_SECONDS) stopRecording();
        return next;
      });
    }, 1000);
  }, [stopRecording]);

  return { isRecording, recordingSeconds, audioBlob, error, startRecording, stopRecording };
}
