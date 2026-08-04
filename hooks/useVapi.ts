"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import type { VapiCallStatus } from "@/types";

const vapiPublicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const vapiAssistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

interface UseVapiOptions {
  enabled?: boolean;
  onTranscriptUpdate?: (transcript: string) => void;
  onUserTranscript?: (transcript: string) => void;
  onCallEnded?: () => void;
  onError?: (error: Error) => void;
}

interface TranscriptMessage {
  transcript: string;
  isUser: boolean;
  isFinal: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function diagnosticValue(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0
): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : String(value);
  }

  if (typeof value === "undefined") {
    return "undefined";
  }

  if (typeof value === "bigint" || typeof value === "symbol" || typeof value === "function") {
    return String(value);
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...(value.cause ? { cause: diagnosticValue(value.cause, seen, depth + 1) } : {}),
    };
  }

  if (depth >= 4) {
    return "[truncated]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => diagnosticValue(item, seen, depth + 1));
  }

  if (!isRecord(value)) {
    return String(value);
  }

  if (seen.has(value)) {
    return "[circular]";
  }

  seen.add(value);
  const details: Record<string, unknown> = {};
  const preferredKeys = [
    "name",
    "message",
    "error",
    "description",
    "reason",
    "code",
    "errorCode",
    "status",
    "statusCode",
    "statusText",
    "type",
    "details",
    "context",
    "response",
  ];

  for (const key of preferredKeys) {
    if (key in value) {
      details[key] = diagnosticValue(value[key], seen, depth + 1);
    }
  }

  if (Object.keys(details).length === 0) {
    for (const [key, entry] of Object.entries(value).slice(0, 10)) {
      details[key] = diagnosticValue(entry, seen, depth + 1);
    }
  }

  return Object.keys(details).length > 0
    ? details
    : { value: Object.prototype.toString.call(value) };
}

function formatVapiError(error: unknown): string {
  const details = diagnosticValue(error);

  if (typeof details === "string") {
    return details;
  }

  try {
    return JSON.stringify(details).slice(0, 2000);
  } catch {
    return "Unable to serialize Vapi error details";
  }
}

function readTranscriptMessage(message: unknown): TranscriptMessage | null {
  if (!isRecord(message)) {
    return null;
  }

  const transcript =
    typeof message.transcript === "string"
      ? message.transcript.trim()
      : typeof message.text === "string" && message.type === "transcript"
        ? message.text.trim()
        : "";

  if (!transcript) {
    return null;
  }

  const transcriptType =
    typeof message.transcriptType === "string"
      ? message.transcriptType.toLowerCase()
      : typeof message.status === "string"
        ? message.status.toLowerCase()
        : "";

  return {
    transcript,
    isUser: message.role === "user",
    isFinal: transcriptType !== "partial" && transcriptType !== "interim",
  };
}

export function useVapi({ enabled = true, ...options }: UseVapiOptions = {}) {
  const [callStatus, setCallStatus] = useState<VapiCallStatus>({
    status: "disconnected",
    isSpeaking: false,
    isMuted: false,
    transcript: "",
    error: null,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const reportError = useCallback((error: unknown) => {
    const diagnostic = formatVapiError(error);
    console.error("Vapi call failed", {
      diagnostic,
      details: diagnosticValue(error),
    });
    setCallStatus((previous) => ({
      ...previous,
      status: "disconnected",
      isSpeaking: false,
      error: diagnostic,
    }));
    optionsRef.current.onError?.(new Error(diagnostic));
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!vapiPublicKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      reportError(
        new Error("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set in environment variables.")
      );
      return;
    }

    const vapi = new Vapi(vapiPublicKey);
    setIsInitialized(true);
    vapiRef.current = vapi;

    const handleCallStart = () => {
      setCallStatus((previous) => ({
        ...previous,
        status: "connected",
        isMuted: false,
        error: null,
      }));
    };
    const handleSpeechStart = () => {
      setCallStatus((previous) => ({ ...previous, isSpeaking: true }));
    };
    const handleSpeechEnd = () => {
      setCallStatus((previous) => ({ ...previous, isSpeaking: false }));
    };
    const handleMessage = (message: unknown) => {
      const transcriptMessage = readTranscriptMessage(message);
      if (!transcriptMessage) {
        return;
      }

      setCallStatus((previous) => ({
        ...previous,
        transcript: transcriptMessage.transcript,
      }));

      if (transcriptMessage.isUser && transcriptMessage.isFinal) {
        optionsRef.current.onTranscriptUpdate?.(transcriptMessage.transcript);
        optionsRef.current.onUserTranscript?.(transcriptMessage.transcript);
      }
    };
    const handleCallEnd = () => {
      setCallStatus((previous) => ({
        ...previous,
        status: "ended",
        isSpeaking: false,
        isMuted: false,
      }));
      optionsRef.current.onCallEnded?.();
    };
    const handleCallStartFailed = (event: unknown) => {
      reportError(event);
    };

    vapi.on("call-start", handleCallStart);
    vapi.on("speech-start", handleSpeechStart);
    vapi.on("speech-end", handleSpeechEnd);
    vapi.on("message", handleMessage);
    vapi.on("call-end", handleCallEnd);
    vapi.on("call-start-failed", handleCallStartFailed);
    vapi.on("error", reportError);

    return () => {
      vapi.removeAllListeners();
      void vapi.stop().catch(() => undefined);
      vapiRef.current = null;
      setIsInitialized(false);
    };
  }, [enabled, reportError]);

  const startCall = useCallback(async (): Promise<boolean> => {
    if (!vapiRef.current) {
      reportError(
        new Error(
          "Vapi client is not initialized. Verify NEXT_PUBLIC_VAPI_PUBLIC_KEY and voice mode."
        )
      );
      return false;
    }

    if (!vapiAssistantId) {
      reportError(
        new Error("NEXT_PUBLIC_VAPI_ASSISTANT_ID is not configured.")
      );
      return false;
    }

    try {
      setCallStatus((previous) => ({
        ...previous,
        status: "connecting",
        error: null,
      }));
      const call = await vapiRef.current.start(vapiAssistantId);

      if (!call) {
        throw new Error(
          "Vapi did not create a call. Check the published assistant ID and public key."
        );
      }

      return true;
    } catch (error: unknown) {
      reportError(error);
      return false;
    }
  }, [reportError]);

  const endCall = useCallback(async (): Promise<boolean> => {
    if (!vapiRef.current) {
      return false;
    }

    try {
      await vapiRef.current.stop();
      setCallStatus((previous) => ({
        ...previous,
        status: "ended",
        isSpeaking: false,
        isMuted: false,
      }));
      return true;
    } catch (error: unknown) {
      reportError(error);
      return false;
    }
  }, [reportError]);

  const toggleMute = useCallback(() => {
    if (!vapiRef.current) {
      return;
    }

    try {
      const isMuted = vapiRef.current.isMuted();
      vapiRef.current.setMuted(!isMuted);
      setCallStatus((previous) => ({ ...previous, isMuted: !isMuted }));
    } catch (error: unknown) {
      reportError(error);
    }
  }, [reportError]);

  const speak = useCallback(
    (message: string): boolean => {
      const text = message.trim();
      if (!text) {
        return false;
      }

      if (!vapiRef.current) {
        reportError(new Error("Vapi is not initialized for text-to-speech."));
        return false;
      }

      try {
        vapiRef.current.say(text);
        return true;
      } catch (error: unknown) {
        reportError(error);
        return false;
      }
    },
    [reportError]
  );

  return {
    callStatus,
    startCall,
    endCall,
    toggleMute,
    speak,
    isInitialized,
  };
}
