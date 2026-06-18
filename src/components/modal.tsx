"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}

export default function Modal({ open, onClose, title, children, wide }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      ref.current?.showModal();
    } else {
      ref.current?.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={`fixed inset-0 z-50 m-auto rounded-xl border-0 bg-white p-0 shadow-2xl backdrop:bg-black/40 ${wide ? "w-full max-w-3xl" : "w-full max-w-lg"}`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xl leading-none"
        >
          ×
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>
    </dialog>
  );
}
