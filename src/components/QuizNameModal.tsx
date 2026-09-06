"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function QuizNameModal({
  open,
  initial = "",
  confirmLabel = "Start quiz",
  onSubmit,
  onCancel,
}: {
  open: boolean;
  initial?: string;
  confirmLabel?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initial);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open, initial]);

  if (!open) return null;

  const submit = () => onSubmit(value.trim());

  return (
    <div className="fixed inset-0 z-[60] bg-[#151021]/90 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-[#251C33] border border-[#3A2E50] rounded-2xl p-6 w-80 max-w-full space-y-4 screen-enter shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-[#F0EAF6]">
            Name this quiz
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="text-[#8D7FA0] hover:text-[#F0EAF6] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-[#B8A9C8] leading-relaxed">
          Give your quiz a name so it's easy to find in history.
        </p>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="e.g. Cellular Respiration"
          className="w-full bg-[#151021] border border-[#3A2E50] rounded-xl px-4 py-3 text-sm text-[#F0EAF6] placeholder-[#6E5F81] focus:outline-none focus:border-fuchsia-400/60 transition-colors"
        />
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
            onClick={submit}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-fuchsia-500 to-fuchsia-400 hover:from-fuchsia-400 hover:to-fuchsia-300 text-[#151021]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}