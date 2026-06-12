"use client";
import { useState } from "react";

interface LogoCardProps {
  src: string;
  alt?: string;
  size?: number;
  imageSize?: number;
}

// PERF: no backdrop-blur — that was triggering GPU compositing on every card.
// Replaced with a solid semi-transparent bg that achieves the same look cheaply.
export default function LogoCard({ src, alt, size = 100, imageSize = 72 }: LogoCardProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className="rounded-[28px] flex items-center justify-center shadow-lg flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.10)",
        // No backdropFilter here — was the #1 per-card GPU cost
      }}
    >
      {failed ? (
        // Fallback: show first letter of alt as text badge
        <span
          style={{
            fontSize: imageSize * 0.45,
            fontWeight: 900,
            color: "rgba(255,255,255,0.25)",
            fontFamily: "sans-serif",
            userSelect: "none",
          }}
        >
          {(alt ?? "?")[0].toUpperCase()}
        </span>
      ) : (
        <img
          src={src}
          alt={alt ?? ""}
          onError={() => setFailed(true)}
          style={{
            width: imageSize,
            height: imageSize,
            objectFit: "contain",
            // drop-shadow is cheaper than box-shadow on img
            filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.35))",
          }}
        />
      )}
    </div>
  );
}
