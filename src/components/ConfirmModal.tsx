"use client";

import { X } from "lucide-react";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  destructive = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[#151021]/90 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-[#251C33] border border-[#3A2E50] rounded-2xl p-6 w-80 max-w-full space-y-4 screen-enter shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-[#F0EAF6]">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="text-[#8D7FA0] hover:text-[#F0EAF6] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        {message && (
          <p className="text-sm text-[#B8A9C8] leading-relaxed [overflow-wrap:anywhere]">
            {message}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-[#3A2E50] text-sm font-semibold text-[#F0EAF6] hover:border-[#6E5F81] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              destructive
                ? "bg-red-500 hover:bg-red-400 text-white"
                : "bg-gradient-to-r from-fuchsia-500 to-fuchsia-400 hover:from-fuchsia-400 hover:to-fuchsia-300 text-[#151021]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}