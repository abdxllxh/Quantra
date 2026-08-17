"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { motionPresets } from "@/lib/motion.theme";

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const isSuccess = t.type === "success";
          const isError = t.type === "error";
          const isWarning = t.type === "warning";

          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94, transition: motionPresets.snap }}
              transition={motionPresets.ui}
              className={`pointer-events-auto p-3.5 rounded-lg border flex items-center justify-between gap-3 shadow-lg bg-[#FFFFFF] ${
                isSuccess
                  ? "border-[#1E7A4C]/40 text-[#1E7A4C]"
                  : isError
                  ? "border-[#B4392C]/40 text-[#B4392C]"
                  : isWarning
                  ? "border-[#C4622D]/40 text-[#C4622D]"
                  : "border-[#E8E4DC] text-[#6B6660]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-[#1E7A4C] shrink-0 stroke-[1.75]" />}
                {isError && <AlertCircle className="w-4 h-4 text-[#B4392C] shrink-0 stroke-[1.75]" />}
                {isWarning && <AlertTriangle className="w-4 h-4 text-[#C4622D] shrink-0 stroke-[1.75]" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-[#6B6660] shrink-0 stroke-[1.75]" />}
                <span className="text-xs font-medium text-[#1A1815] truncate">{t.message}</span>
              </div>

              <button
                onClick={() => dismissToast(t.id)}
                className="text-[#6B6660] hover:text-[#1A1815] p-1 rounded hover:bg-[#F4F0E8] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5 stroke-[1.75]" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
