import React from "react";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm mx-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-fade-in">
        <h2 className="text-sm font-semibold text-slate-50 mb-2">{title}</h2>
        <p className="text-xs text-slate-300 mb-5 whitespace-pre-line">{message}</p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500 hover:text-slate-100 transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-rose-400 transition shadow-md shadow-rose-500/40"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
