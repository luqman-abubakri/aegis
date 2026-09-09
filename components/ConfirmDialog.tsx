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
      ? "border-[#F97316] bg-[#fff7ed] text-[#EA580C] hover:bg-[#F97316] hover:text-white"
      : "border-[#111111] bg-[#F7F7F5] text-[#111111] hover:bg-[#111111] hover:text-white";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111111]/70"
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
            className="mx-4 w-full max-w-md border border-[#111111] bg-white p-6 sm:p-8"
          >
            {variant === "danger" && (
              <div className="mb-5 flex h-14 w-14 items-center justify-center border border-[#F97316] bg-[#fff7ed]">
                <AlertTriangle size={28} className="text-[#EA580C]" />
              </div>
            )}

            <h2
              id="confirm-dialog-title"
              className="text-xl font-bold text-[#111111]"
            >
              {title}
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-[#666666]">
              {message}
            </p>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={onCancel}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 border border-[#111111] bg-white px-5 py-3 text-sm font-semibold text-[#111111] transition-colors hover:bg-[#F7F7F5] disabled:cursor-not-allowed disabled:opacity-50"
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