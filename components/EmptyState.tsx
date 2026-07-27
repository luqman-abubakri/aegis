"use client";

import { motion } from "framer-motion";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center backdrop-blur-xl"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-800/50 text-slate-500">
        {icon || <Inbox size={36} />}
      </div>

      <h3 className="text-xl font-bold text-white">{title}</h3>

      {description && (
        <p className="mt-3 max-w-md text-slate-400">{description}</p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

