"use client";

import { Mic, MicOff, PhoneOff, Loader2 } from "lucide-react";
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
    <div className="flex items-center gap-4">
      {!isConnected ? (
        <button
          onClick={onStartCall}
          disabled={disabled || isConnecting}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isConnecting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Mic size={20} />
              Start Voice Call
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMute}
            disabled={disabled}
            className={`flex items-center gap-2 rounded-xl border px-5 py-3 font-semibold transition-all duration-300 ${
              callStatus.isMuted
                ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
            }`}
            title={callStatus.isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {callStatus.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            {callStatus.isMuted ? "Unmute" : "Mute"}
          </button>

          <button
            onClick={onEndCall}
            className="flex items-center gap-2 rounded-xl bg-red-600/20 px-5 py-3 font-semibold text-red-400 transition-all duration-300 hover:bg-red-600/30 hover:text-red-300"
          >
            <PhoneOff size={20} />
            End Call
          </button>
        </div>
      )}

      {isConnecting && (
        <span className="text-sm text-slate-400">
          Connecting to voice interview...
        </span>
      )}

      {isConnected && (
        <span className="flex items-center gap-2 text-sm text-green-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          Live
        </span>
      )}
    </div>
  );
}

