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
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Voice interview</p>
            <p className="text-xs text-slate-400">
              {isConnected ? "Session live" : isConnecting ? "Connecting…" : "Ready to begin"}
            </p>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isConnected
                ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                : "border border-slate-700 bg-slate-800/70 text-slate-400"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isConnected ? "animate-pulse bg-emerald-400" : "bg-slate-500"}`} />
            {isConnected ? "Live" : isConnecting ? "Connecting" : "Standby"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isConnected ? (
            <button
              onClick={onStartCall}
              disabled={disabled || isConnecting}
              title="Start voice interview"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
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
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                }`}
              >
                {callStatus.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                {callStatus.isMuted ? "Unmute" : "Mute"}
              </button>

              <button
                onClick={onEndCall}
                title="End call"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition-all duration-300 hover:bg-red-500/20"
              >
                <PhoneOff size={18} />
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-slate-400">
          <Volume2 size={14} />
          {callStatus.isSpeaking ? "Speaking" : "Listening"}
        </span>
      </div>
    </div>
  );
}

