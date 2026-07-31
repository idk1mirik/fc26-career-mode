"use client";

export default function ThemedButton({
  children,
  onClick,
}: any) {
  return (
    <button
      onClick={onClick}
      className="
        px-6
        py-3
        rounded-2xl
        font-black
        transition-all
        hover:scale-105
        cursor-pointer
        bg-slate-900/80
        border
        border-slate-800
        text-slate-300
        hover:border-white
        font-sans
      "
    >
      {children}
    </button>
  );
}