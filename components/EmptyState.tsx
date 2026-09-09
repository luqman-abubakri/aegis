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
      className="flex flex-col items-center justify-center border border-[#D9D9D4] bg-white p-12 text-center hard-card"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center border border-[#D9D9D4] bg-[#F1F1EE] text-[#888888]">
        {icon || <Inbox size={36} />}
      </div>

      <h3 className="text-xl font-bold text-[#111111]">{title}</h3>

      {description && (
        <p className="mt-3 max-w-md text-[#666666]">{description}</p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

