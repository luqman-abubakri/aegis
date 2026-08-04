"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onCancel]);

  const confirmColorClass =
    variant === "danger"
      ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
      : "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            if (!loading) onCancel();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="mx-4 w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
          >
            {variant === "danger" && (
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
                <AlertTriangle size={28} className="text-red-400" />
              </div>
            )}

            <h2
              id="confirm-dialog-title"
              className="text-xl font-bold text-white"
            >
              {title}
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {message}
            </p>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={onCancel}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-5 py-3 text-sm font-semibold text-slate-300 transition-all duration-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelLabel}
              </button>

              <button
                onClick={onConfirm}
                disabled={loading}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${confirmColorClass}`}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}