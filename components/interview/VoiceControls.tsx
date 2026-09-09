"use client";

import { Loader2, Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import type { VapiCallStatus } from "@/types";

interface VoiceControlsProps {
  callStatus: VapiCallStatus;
  onStartCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  disabled?: boolean;
}

export function VoiceControls({
  callStatus,
  onStartCall,
  onEndCall,
  onToggleMute,
  disabled = false,
}: VoiceControlsProps) {
  const isConnected = callStatus.status === "connected";
  const isConnecting = callStatus.status === "connecting";

  return (
    <div className="flex flex-col gap-3">
      <div className="border border-[#D9D9D4] bg-white p-3 hard-card">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#111111]">Voice interview</p>
            <p className="text-xs text-[#666666]">
              {isConnected ? "Session live" : isConnecting ? "Connecting…" : "Ready to begin"}
            </p>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isConnected
                ? "border border-lime-300 bg-lime-50 text-lime-700"
                : "border border-[#D9D9D4] bg-[#F1F1EE] text-[#666666]"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isConnected ? "animate-pulse bg-[#A3E635]" : "bg-[#888888]"}`} />
            {isConnected ? "Live" : isConnecting ? "Connecting" : "Standby"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isConnected ? (
            <button
              onClick={onStartCall}
              disabled={disabled || isConnecting}
              title="Start voice interview"
              className="hard-edge inline-flex flex-1 items-center justify-center gap-2 bg-[#EC4899] px-4 py-3 text-sm font-semibold text-white hover:bg-[#DB2777] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mic size={18} />
                  Start
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={onToggleMute}
                disabled={disabled}
                title={callStatus.isMuted ? "Unmute microphone" : "Mute microphone"}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                  callStatus.isMuted
                    ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                    : "border-[#D9D9D4] bg-[#F1F1EE] text-[#666666] hover:border-[#111111]"
                }`}
              >
                {callStatus.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                {callStatus.isMuted ? "Unmute" : "Mute"}
              </button>

              <button
                onClick={onEndCall}
                title="End call"
                className="hard-edge inline-flex items-center justify-center gap-2 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100"
              >
                <PhoneOff size={18} />
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-2 border border-[#D9D9D4] bg-[#F1F1EE] px-3 py-1 text-[#666666]">
          <Volume2 size={14} />
          {callStatus.isSpeaking ? "Speaking" : "Listening"}
        </span>
      </div>
    </div>
  );
}

