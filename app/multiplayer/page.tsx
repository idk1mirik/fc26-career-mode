"use client";

import Link from "next/link";
import { useThemeStore } from "@/app/store/themeStore";
import ThemeToggle from "@/components/ThemeToggle";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── PARTICLES (Classic) ──────────────────────────────────────────────────────
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);

    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(52,211,153,0.5)";
        ctx.fill();
      });

      pts.forEach((a, i) =>
        pts.slice(i + 1).forEach(b => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(52,211,153,${0.15 * (1 - d / 120)})`;
            ctx.stroke();
          }
        })
      );
      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ─── AURORA BLOBS ─────────────────────────────────────────────────────────────
function AuroraBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 mix-blend-screen filter blur-[100px]">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute -top-20 -right-20 w-[30rem] h-[30rem] bg-pink-500/20 rounded-full animate-pulse" style={{ animationDuration: "12s" }} />
      <div className="absolute -bottom-40 left-20 w-[25rem] h-[25rem] bg-violet-500/20 rounded-full animate-pulse" style={{ animationDuration: "10s" }} />
    </div>
  );
}

// ─── RUNE FIELD (Maleficent) ──────────────────────────────────────────────────
const RUNES = ["ᚠ","ᚢ","ᚦ","ᚨ","ᚱ","ᚲ","ᚷ","ᚹ","ᚺ","ᚾ","ᛁ","ᛃ","ᛇ","ᛈ","ᛉ","ᛊ","ᛏ","ᛒ","ᛖ","ᛗ","ᛚ","ᛜ","ᛞ","ᛟ"];

function RuneField() {
  const [runes, setRunes] = useState<{ char: string; x: number; y: number; delay: number; dur: number }[]>([]);

  useEffect(() => {
    setRunes(
      Array.from({ length: 30 }, () => ({
        char: RUNES[Math.floor(Math.random() * RUNES.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 8,
        dur: 3 + Math.random() * 5,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 font-mono text-purple-500">
      {runes.map((r, i) => (
        <span
          key={i}
          className="absolute text-sm select-none"
          style={{
            left: `${r.x}%`,
            top: `${r.y}%`,
            animation: `runeFlicker ${r.dur}s ${r.delay}s ease-in-out infinite`,
          }}
        >
          {r.char}
        </span>
      ))}
    </div>
  );
}

function Scanlines() {
  return (
    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[size:100%_4px]" />
  );
}

// ─── COPY BUTTON ──────────────────────────────────────────────────────────────
function CopyButton({ code, theme }: { code: string; theme: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const btnCls = {
    classic: "border border-emerald-700/50 text-emerald-400 hover:bg-emerald-950/60 font-mono text-xs tracking-widest uppercase px-4 py-2 rounded-lg transition-all duration-200",
    aurora: "border-2 border-pink-300 text-pink-600 hover:bg-pink-100 font-semibold text-xs tracking-wide uppercase px-4 py-2 rounded-2xl transition-all duration-200",
    maleficent: "border border-fuchsia-700/50 text-fuchsia-400 hover:bg-fuchsia-950/40 font-mono text-xs tracking-widest uppercase px-4 py-2 transition-all duration-200",
  }[theme] ?? "";

  return (
    <button onClick={copy} className={btnCls}>
      {copied
        ? theme === "maleficent" ? "✓ COPIED" : theme === "aurora" ? "✨ Copied!" : "✓ COPIED"
        : theme === "maleficent" ? "⛓ COPY" : theme === "aurora" ? "✦ Copy" : "⊕ COPY"}
    </button>
  );
}

// ─── WAITING DOTS ─────────────────────────────────────────────────────────────
function WaitingDots({ theme }: { theme: string }) {
  const dotCls = {
    classic: "bg-emerald-400",
    aurora: "bg-pink-400",
    maleficent: "bg-fuchsia-500",
  }[theme] ?? "bg-white";

  return (
    <div className="flex gap-1.5 items-center">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${dotCls} animate-bounce`}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ─── THEME CONFIGS ────────────────────────────────────────────────────────────
const CONFIGS = {
  classic: {
    wrapperBg: "bg-[#020617]",
    grid: "opacity-[0.025]",
    back: {
      cls: "bg-slate-900/80 border border-slate-700/50 text-slate-400 hover:border-emerald-500/60 hover:text-emerald-300 font-mono text-xs tracking-widest uppercase px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2",
      label: "← BACK",
    },
    header: {
      eyebrow: "text-emerald-400/70 font-mono text-[10px] tracking-[0.5em] uppercase",
      eyebrowText: "// MULTIPLAYER SESSION //",
      title: "text-white font-black tracking-tighter leading-[0.85] uppercase drop-shadow-[0_0_40px_rgba(52,211,153,0.2)]",
      titleText: "TACTICAL\nWARROOM",
      titleStyle: { fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(3.5rem,9vw,7rem)" },
      pill: {
        cls: "bg-emerald-950/80 border border-emerald-700/40 text-emerald-300 font-mono text-[11px] tracking-[0.2em] uppercase",
        dot: "bg-emerald-400",
        text: "LIVE MATCHMAKING · 2 SLOTS",
      },
    },
    hostCard: {
      wrap: "classic-card",
      badge: { cls: "bg-emerald-950 border border-emerald-700/50 text-emerald-400 font-mono text-[10px] tracking-widest uppercase px-3 py-1 rounded-full", text: "HOST SESSION" },
      title: "text-white font-black text-2xl tracking-tight",
      titleText: "Your War Room",
      codeLabel: "text-slate-500 font-mono text-[10px] tracking-[0.3em] uppercase mb-3",
      codeBox: "bg-slate-950/80 border border-emerald-900/60 rounded-2xl px-8 py-5 text-emerald-400 font-black tracking-[0.3em] text-4xl md:text-5xl font-mono select-all cursor-pointer hover:border-emerald-600/60 transition-colors duration-300 text-center",
      sub: "text-slate-500 text-xs font-mono tracking-widest mt-4",
      subText: "Share code · Await opponent · Dominate",
      statusLabel: "text-slate-600 font-mono text-[10px] uppercase tracking-widest mb-2",
      statusText: "WAITING FOR OPPONENT",
    },
    joinCard: {
      wrap: "classic-card",
      badge: { cls: "bg-blue-950 border border-blue-700/50 text-blue-400 font-mono text-[10px] tracking-widest uppercase px-3 py-1 rounded-full", text: "JOIN SESSION" },
      title: "text-white font-black text-2xl tracking-tight",
      titleText: "Enter Room",
      inputCls: "w-full bg-slate-950/80 border border-slate-700/50 text-white placeholder-slate-600 focus:border-emerald-500/60 rounded-xl px-5 py-4 font-mono text-center text-2xl tracking-[0.3em] uppercase outline-none transition-all duration-300 caret-emerald-400",
      inputPlaceholder: "ROOM CODE",
      btnCls: "w-full py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black tracking-widest uppercase rounded-xl transition-all duration-200 shadow-[0_4px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_30px_rgba(37,99,235,0.5)] text-sm",
      btnText: "ENTER WARROOM →",
      sub: "text-slate-600 text-xs font-mono tracking-widest mt-4 text-center",
      subText: "6-character alphanumeric code",
    },
    divider: {
      cls: "hidden md:flex flex-col items-center justify-center gap-3",
      lineTop: "flex-1 border-l border-slate-800",
      lineBottom: "flex-1 border-l border-slate-800",
      text: "text-slate-700 font-mono text-xs tracking-widest",
      label: "OR",
    },
  },
  aurora: {
    wrapperBg: "bg-[#fdf4ff]",
    back: {
      cls: "bg-pink-100/80 border-2 border-pink-300/60 text-pink-600 hover:bg-pink-200/60 hover:border-pink-400 text-sm italic px-5 py-2.5 rounded-2xl transition-all duration-300 flex items-center gap-2",
      label: "← Return",
    },
    header: {
      eyebrow: "text-violet-500/80 tracking-[0.25em] uppercase text-xs",
      eyebrowText: "✦ Multiplayer Dream ✦",
      eyebrowStyle: { fontFamily: "'Cormorant Garamond', serif" },
      title: "font-black leading-[0.9] text-transparent bg-clip-text",
      titleText: "Play\nTogether",
      titleStyle: {
        fontFamily: "'Fraunces',serif",
        fontSize: "clamp(3.5rem,10vw,7.5rem)",
        backgroundImage: "linear-gradient(135deg,#a855f7 0%,#ec4899 40%,#f97316 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      },
      subtitle: "text-violet-400/60 italic text-lg",
      subtitleText: "Your legend becomes greater with a rival.",
      subtitleStyle: { fontFamily: "'Cormorant Garamond',serif" },
      pill: {
        cls: "bg-white/60 backdrop-blur border border-violet-200 text-violet-700 shadow-sm text-[11px] tracking-[0.2em] uppercase",
        dot: "bg-pink-400",
        text: "Dream Realm Open · Awaiting Rivals",
      },
    },
    hostCard: {
      wrap: "aurora-card",
      badge: { cls: "bg-pink-100 border border-pink-200 text-pink-700 text-[10px] tracking-widest uppercase px-3 py-1 rounded-full font-semibold", text: "YOUR REALM" },
      title: "text-violet-900 font-black text-2xl",
      titleText: "Your Dream Room",
      titleStyle: { fontFamily: "'Fraunces',serif" },
      codeLabel: "text-violet-400/60 text-xs tracking-wider uppercase mb-3",
      codeLabelStyle: { fontFamily: "'Cormorant Garamond',serif" },
      codeBox: "bg-white/80 border-2 border-pink-200 rounded-3xl px-8 py-5 text-pink-600 font-black tracking-[0.3em] text-4xl md:text-5xl select-all cursor-pointer hover:border-pink-400 hover:shadow-[0_8px_30px_rgba(236,72,153,0.15)] transition-all duration-300 text-center",
      sub: "text-violet-400/50 text-xs italic mt-4",
      subStyle: { fontFamily: "'Cormorant Garamond',serif" },
      subText: "Share this code to invite your rival",
      statusLabel: "text-violet-400/50 text-xs uppercase tracking-widest mb-2",
      statusText: "Awaiting another dreamer…",
    },
    joinCard: {
      wrap: "aurora-card",
      badge: { cls: "bg-violet-100 border border-violet-200 text-violet-700 text-[10px] tracking-widest uppercase px-3 py-1 rounded-full font-semibold", text: "ENTER REALM" },
      title: "text-violet-900 font-black text-2xl",
      titleText: "Join a Room",
      titleStyle: { fontFamily: "'Fraunces',serif" },
      inputCls: "w-full bg-white/90 border-2 border-violet-200 text-violet-900 placeholder-violet-300 focus:border-pink-400 rounded-2xl px-5 py-4 text-center text-2xl tracking-[0.3em] font-bold outline-none transition-all duration-300",
      inputPlaceholder: "enter code",
      btnCls: "w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 active:opacity-75 text-white font-black tracking-wider uppercase rounded-2xl transition-all duration-200 shadow-[0_4px_20px_rgba(236,72,153,0.3)] hover:shadow-[0_6px_30px_rgba(236,72,153,0.45)] text-sm",
      btnText: "Enter Dream Realm →",
      sub: "text-violet-400/50 text-xs italic mt-4 text-center",
      subStyle: { fontFamily: "'Cormorant Garamond',serif" },
      subText: "6-character code from your rival",
    },
    divider: {
      cls: "hidden md:flex flex-col items-center justify-center gap-3",
      lineTop: "flex-1 border-l border-pink-200",
      lineBottom: "flex-1 border-l border-pink-200",
      text: "text-pink-300 text-xs italic",
      label: "or",
    },
  },
  maleficent: {
    wrapperBg: "bg-[#04000a]",
    back: {
      cls: "bg-black/60 border border-purple-900/60 text-purple-400 hover:border-fuchsia-500/60 hover:text-fuchsia-400 font-mono text-xs tracking-widest uppercase px-4 py-2.5 transition-all duration-300 flex items-center gap-2",
      label: "← RETURN",
    },
    header: {
      eyebrow: "text-fuchsia-400/50 font-mono text-[10px] tracking-[0.5em] uppercase",
      eyebrowText: "⛓ VOID PROTOCOL · MULTIPLAYER ⛓",
      title: "font-black leading-[0.85] uppercase tracking-widest",
      titleText: "TACTICAL\nVOID",
      titleStyle: {
        fontFamily: "'Share Tech Mono',monospace",
        fontSize: "clamp(3.5rem,9vw,7rem)",
        background: "linear-gradient(180deg,#e879f9 0%,#a855f7 50%,#7c3aed 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        filter: "drop-shadow(0 0 30px rgba(217,70,239,0.4))",
      },
      pill: {
        cls: "bg-purple-950/60 border border-purple-700/40 text-purple-300 font-mono text-[11px] tracking-[0.2em] uppercase",
        dot: "bg-fuchsia-500",
        text: "VOID MATCHMAKING · ACTIVE",
      },
    },
    hostCard: {
      wrap: "mal-card",
      badge: { cls: "bg-fuchsia-950/80 border border-fuchsia-700/40 text-fuchsia-400 font-mono text-[10px] tracking-widest uppercase px-3 py-1", text: "⛓ HOST GRID" },
      title: "text-fuchsia-300 font-bold text-2xl tracking-tight uppercase font-mono",
      titleText: "Your Domain",
      codeLabel: "text-purple-500/50 font-mono text-[10px] tracking-[0.4em] uppercase mb-3",
      codeBox: "bg-purple-950/20 border border-purple-800/50 px-8 py-5 text-fuchsia-400 font-bold tracking-[0.3em] text-4xl md:text-5xl font-mono select-all cursor-pointer hover:border-fuchsia-600/60 hover:shadow-[0_0_25px_rgba(217,70,239,0.15)] transition-all duration-300 text-center shadow-[0_0_15px_rgba(217,70,239,0.08)]",
      sub: "text-purple-600/40 text-[10px] font-mono tracking-[0.3em] uppercase mt-4",
      subText: ">_ TRANSMIT CODE TO ADVERSARY",
      statusLabel: "text-purple-700/50 font-mono text-[10px] uppercase tracking-widest mb-2",
      statusText: ">_ SCANNING VOID FOR OPPONENT…",
    },
    joinCard: {
      wrap: "mal-card",
      badge: { cls: "bg-purple-950/80 border border-purple-700/40 text-purple-400 font-mono text-[10px] tracking-widest uppercase px-3 py-1", text: "🔮 BREACH VOID" },
      title: "text-purple-300 font-bold text-2xl tracking-tight uppercase font-mono",
      titleText: "Enter Void",
      inputCls: "w-full bg-black border border-purple-800/60 text-fuchsia-400 placeholder-purple-900 focus:border-fuchsia-600/60 px-5 py-4 font-mono text-center text-2xl tracking-[0.3em] uppercase outline-none transition-all duration-300 caret-fuchsia-500",
      inputPlaceholder: "VOID CODE",
      btnCls: "w-full py-4 bg-transparent border-2 border-purple-600/60 hover:bg-purple-600/15 hover:border-fuchsia-500/60 text-purple-300 font-bold tracking-widest uppercase font-mono transition-all duration-200 shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] text-sm",
      btnText: "⛓ BREACH VOID →",
      sub: "text-purple-700/40 text-[10px] font-mono tracking-[0.3em] uppercase mt-4 text-center",
      subText: ">_ INPUT 6-CHAR VOID SIGNATURE",
    },
    divider: {
      cls: "hidden md:flex flex-col items-center justify-center gap-3",
      lineTop: "flex-1 border-l border-purple-900/50",
      lineBottom: "flex-1 border-l border-purple-900/50",
      text: "text-purple-800/60 font-mono text-[10px] tracking-widest",
      label: "|OR|",
    },
  },
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function MultiplayerPage() {
  const theme = useThemeStore((s) => s.theme) as keyof typeof CONFIGS;
  const cfg = CONFIGS[theme] ?? CONFIGS.classic;
  const hdr = (cfg as any).header;

  const [mounted, setMounted] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [joinError, setJoinError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    setRoomCode(
      Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
    );
    setMounted(true);
  }, []);

  const joinRoom = useCallback(() => {
    if (joinInput.length < 6) return;
    // Validate format: 6 alphanumeric chars
    if (!/^[A-Z0-9]{6}$/.test(joinInput)) {
      setJoinError(true);
      setTimeout(() => setJoinError(false), 1500);
      return;
    }
    // Navigate to the multiplayer room
    router.push(`/multiplayer/${joinInput}`);
  }, [joinInput, router]);

  return (
    <main className={`min-h-screen relative overflow-hidden ${cfg.wrapperBg} transition-all duration-700`}>
      {/* ── Global styles ── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:opsz,wght@9..144,100..900&family=Cormorant+Garamond:wght@400;600&family=Share+Tech+Mono&display=swap');

        /* ── Cards ── */
        .classic-card {
          background: linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(2,6,23,0.9) 100%);
          border: 1px solid rgba(71,85,105,0.5);
          padding: 2.5rem;
          border-radius: 24px;
          backdrop-filter: blur(20px);
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .classic-card:hover { border-color: rgba(52,211,153,0.25); box-shadow: 0 0 60px rgba(52,211,153,0.05), inset 0 0 40px rgba(52,211,153,0.02); }

        .aurora-card {
          background: rgba(255,255,255,0.55);
          border: 2px solid rgba(244,114,182,0.25);
          padding: 2.5rem;
          border-radius: 32px;
          backdrop-filter: blur(24px);
          box-shadow: 0 8px 32px rgba(236,72,153,0.08), inset 0 1px 0 rgba(255,255,255,0.8);
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .aurora-card:hover { border-color: rgba(244,114,182,0.5); box-shadow: 0 16px 48px rgba(236,72,153,0.15), inset 0 1px 0 rgba(255,255,255,0.8); }

        .mal-card {
          background: rgba(4,0,10,0.95);
          border: 1px solid rgba(126,34,206,0.3);
          padding: 2.5rem;
          border-radius: 4px;
          font-family: 'Share Tech Mono', monospace;
          position: relative;
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .mal-card::before { content:''; position:absolute; top:0;left:0;right:0;height:1px; background:linear-gradient(90deg,transparent,rgba(217,70,239,0.6),transparent); }
        .mal-card::after { content:''; position:absolute; bottom:0;left:0;right:0;height:1px; background:linear-gradient(90deg,transparent,rgba(139,92,246,0.4),transparent); }
        .mal-card:hover { border-color: rgba(217,70,239,0.4); box-shadow: 0 0 40px rgba(217,70,239,0.1), inset 0 0 30px rgba(217,70,239,0.03); }

        /* ── Animations ── */
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .anim-in { animation: slideUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .anim-d1 { animation-delay: 0.1s; }
        .anim-d2 { animation-delay: 0.25s; }
        .anim-d3 { animation-delay: 0.4s; }
        .anim-d4 { animation-delay: 0.55s; }
        .anim-d5 { animation-delay: 0.7s; }

        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,0.15);} 50%{box-shadow:0 0 20px 4px rgba(52,211,153,0.2);} }
        .code-pulse { animation: pulseGlow 3s ease-in-out infinite; }

        @keyframes scanSweep { from { transform: translateX(-100%); } to { transform: translateX(200%); } }

        @keyframes codeReveal {
          from { opacity: 0; transform: scale(0.85); letter-spacing: 0.8em; }
          to { opacity: 1; transform: scale(1); letter-spacing: 0.3em; }
        }

        @keyframes runeFlicker {
          0%, 100% { opacity: 0.15; transform: scale(0.9); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }

        .room-code {
          animation: codeReveal 0.6s ease-out, pulseGlow 3s ease-in-out infinite;
        }
      `}</style>

      {/* ── Backgrounds ── */}
      {mounted && theme === "classic" && <Particles />}
      {mounted && theme === "aurora" && <AuroraBlobs />}
      {mounted && theme === "maleficent" && <><RuneField /><Scanlines /></>}

      {/* ── Classic grid ── */}
      {theme === "classic" && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{ backgroundImage: "linear-gradient(rgba(52,211,153,1) 1px,transparent 1px),linear-gradient(90deg,rgba(52,211,153,1) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />
      )}

      {/* ── Maleficent corners ── */}
      {theme === "maleficent" && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
          {["top-0 left-0","top-0 right-0","bottom-0 left-0","bottom-0 right-0"].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-16 h-16`} style={{
              background: i < 2
                ? "linear-gradient(135deg,rgba(217,70,239,0.15),transparent)"
                : "linear-gradient(315deg,rgba(139,92,246,0.15),transparent)",
            }}/>
          ))}
        </div>
      )}

      {/* ── Back button ── */}
      <div className="absolute top-5 left-5 z-50 anim-in anim-d1">
        <Link href="/" className={cfg.back.cls}>
          {cfg.back.label}
        </Link>
      </div>

      {/* ── Theme toggle ── */}
      <div className="absolute top-5 right-5 z-50"><ThemeToggle /></div>

      {/* ── Content ── */}
      <div key={theme} className="relative z-10 max-w-5xl mx-auto px-6 py-20 min-h-screen flex flex-col justify-center">

        {/* Header */}
        <div className="text-center mb-12">
          {/* Eyebrow */}
          <div className="flex justify-center mb-4 anim-in anim-d1">
            <span className={hdr.eyebrow} style={hdr.eyebrowStyle}>{hdr.eyebrowText}</span>
          </div>

          {/* Title */}
          <div className="anim-in anim-d2">
            {theme === "maleficent" && (
              <div className="font-mono text-purple-500/30 text-xs tracking-[0.5em] mb-3 uppercase">// COMBAT INITIALIZED //</div>
            )}
            <h1 className={hdr.title} style={hdr.titleStyle}>
              {hdr.titleText.split("\n").map((line: string, i: number) => (
                <span key={i} className="block">{line}</span>
              ))}
            </h1>
            {theme === "aurora" && (
              <div className={hdr.subtitle} style={(hdr as any).subtitleStyle}>{hdr.subtitleText}</div>
            )}
          </div>

          {/* Status pill */}
          <div className="flex justify-center mt-6 anim-in anim-d3">
            <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] ${hdr.pill.cls}`}>
              <span className={`w-2 h-2 rounded-full ${hdr.pill.dot} animate-pulse`} />
              {hdr.pill.text}
            </div>
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 max-w-4xl mx-auto w-full anim-in anim-d4">

          {/* ── HOST CARD ── */}
          {(() => {
            const c = cfg.hostCard;
            return (
              <div className={`flex flex-col gap-5 ${c.wrap} transition-all duration-500`}>
                {/* Badge */}
                <div className="flex items-start justify-between">
                  <span className={c.badge.cls}>{c.badge.text}</span>
                  <CopyButton code={roomCode} theme={theme} />
                </div>

                {/* Title */}
                <h2 className={c.title} style={(c as any).titleStyle}>{c.titleText}</h2>

                {/* Code display */}
                <div>
                  <p className={c.codeLabel} style={(c as any).codeLabelStyle}>Room Code</p>
                  <div className={`${c.codeBox} code-pulse room-code`}>
                    {roomCode}
                  </div>
                </div>

                {/* Waiting status */}
                <div className="flex flex-col gap-2 pt-2">
                  <p className={c.statusLabel}>{c.statusText}</p>
                  <WaitingDots theme={theme} />

                  <button
                    onClick={() => router.push(`/multiplayer/${roomCode}`)}
                    className={cfg.joinCard.btnCls}
                    style={{ marginTop: 8 }}
                  >
                    {theme === "maleficent" ? "OPEN DOMAIN →" : theme === "aurora" ? "Open Room →" : "START HOSTING →"}
                  </button>
                </div>

                {/* Sub */}
                <p className={c.sub} style={(c as any).subStyle}>{c.subText}</p>
              </div>
            );
          })()}

          {/* ── DIVIDER ── */}
          {(() => {
            const d = cfg.divider;
            return (
              <div className={d.cls}>
                <div className={d.lineTop} />
                <span className={d.text}>{d.label}</span>
                <div className={d.lineBottom} />
              </div>
            );
          })()}

          {/* ── JOIN CARD ── */}
          {(() => {
            const c = cfg.joinCard;
            return (
              <div className={`flex flex-col gap-5 ${c.wrap} transition-all duration-500`}>
                {/* Badge */}
                <div>
                  <span className={c.badge.cls}>{c.badge.text}</span>
                </div>

                {/* Title */}
                <h2 className={c.title} style={(c as any).titleStyle}>{c.titleText}</h2>

                {/* Input */}
                <div className="flex flex-col gap-3 mt-2">
                  <input
                    type="text"
                    value={joinInput}
                    onChange={e => setJoinInput(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder={c.inputPlaceholder}
                    maxLength={6}
                    className={`${c.inputCls} ${joinError ? "border-red-500 text-red-500 placeholder-red-300 focus:border-red-500" : ""}`}
                  />
                  <button
                    onClick={joinRoom}
                    className={c.btnCls}
                    disabled={joinInput.length < 6}
                    style={{ opacity: joinInput.length < 6 ? 0.5 : 1 }}
                  >
                    {joinError ? "INVALID CODE" : c.btnText}
                  </button>
                </div>

                {/* Character counter */}
                <div className="flex justify-center gap-1.5 mt-1">
                  {Array.from({ length: 6 }).map((_, i) => {
                    const filled = i < joinInput.length;
                    const dotCls = {
                      classic: filled ? "bg-emerald-400" : "bg-slate-700",
                      aurora: filled ? "bg-pink-400" : "bg-violet-200",
                      maleficent: filled ? "bg-fuchsia-500" : "bg-purple-900",
                    }[theme] ?? "bg-slate-700";
                    return <span key={i} className={`w-2 h-2 rounded-full transition-all duration-200 ${dotCls}`} />;
                  })}
                </div>

                {/* Sub */}
                <p className={c.sub} style={(c as any).subStyle}>{c.subText}</p>
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 anim-in anim-d5">
          {theme === "classic" && (
            <p className="text-slate-700 text-xs font-mono tracking-widest uppercase">
              v4.2.1 · Tactical PvP · Real-time
            </p>
          )}
          {theme === "aurora" && (
            <p className="text-violet-400/40 text-xs italic" style={{ fontFamily: "'Cormorant Garamond',serif" }}>
              Two managers. One pitch. Infinite stories.
            </p>
          )}
          {theme === "maleficent" && (
            <p className="text-purple-700/40 text-[10px] font-mono tracking-[0.3em] uppercase">
              &gt;_ TWO ENTER. ONE DOMINATES.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}