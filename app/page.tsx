"use client";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { useThemeStore } from "@/app/store/themeStore";
import { useEffect, useRef, useState } from "react";

// ─── PARTICLES (Classic only) ─────────────────────────────────────────────────
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize);
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(52,211,153,0.5)";
        ctx.fill();
      });
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(52,211,153,${0.15 * (1 - d / 120)})`;
          ctx.stroke();
        }
      }));
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

// ─── AURORA BLOBS ─────────────────────────────────────────────────────────────
function AuroraBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="aurora-blob aurora-1" />
      <div className="aurora-blob aurora-2" />
      <div className="aurora-blob aurora-3" />
      <div className="aurora-blob aurora-4" />
      <style jsx>{`
        .aurora-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          mix-blend-mode: multiply;
          animation: blobFloat 12s ease-in-out infinite;
        }
        .aurora-1 {
          width: 600px; height: 600px; top: -100px; left: -100px;
          background: radial-gradient(circle, rgba(249,168,212,0.7) 0%, rgba(216,180,254,0.4) 60%, transparent 80%);
          animation-delay: 0s;
        }
        .aurora-2 {
          width: 500px; height: 500px; bottom: -80px; right: -80px;
          background: radial-gradient(circle, rgba(167,243,208,0.6) 0%, rgba(147,197,253,0.4) 60%, transparent 80%);
          animation-delay: -3s;
        }
        .aurora-3 {
          width: 400px; height: 400px; top: 30%; left: 40%;
          background: radial-gradient(circle, rgba(253,224,71,0.4) 0%, rgba(249,115,22,0.2) 60%, transparent 80%);
          animation-delay: -6s;
        }
        .aurora-4 {
          width: 350px; height: 350px; bottom: 20%; left: 10%;
          background: radial-gradient(circle, rgba(196,181,253,0.6) 0%, rgba(244,114,182,0.3) 60%, transparent 80%);
          animation-delay: -9s;
        }
        @keyframes blobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.05); }
          66% { transform: translate(-20px, 30px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}

// ─── MALEFICENT RUNES ─────────────────────────────────────────────────────────
const RUNES = ["ᚠ","ᚢ","ᚦ","ᚨ","ᚱ","ᚲ","ᚷ","ᚹ","ᚺ","ᚾ","ᛁ","ᛃ","ᛇ","ᛈ","ᛉ","ᛊ","ᛏ","ᛒ","ᛖ","ᛗ","ᛚ","ᛜ","ᛞ","ᛟ"];
function RuneField() {
  const [runes, setRunes] = useState<{char:string;x:number;y:number;delay:number;dur:number}[]>([]);
  useEffect(() => {
    setRunes(Array.from({length:30},(_,i)=>({
      char: RUNES[Math.floor(Math.random()*RUNES.length)],
      x: Math.random()*100, y: Math.random()*100,
      delay: Math.random()*8, dur: 3+Math.random()*5,
    })));
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {runes.map((r,i)=>(
        <span key={i} className="absolute text-fuchsia-500/20 font-mono text-2xl"
          style={{left:`${r.x}%`,top:`${r.y}%`,
            animation:`runeFlicker ${r.dur}s ${r.delay}s ease-in-out infinite`}}>
          {r.char}
        </span>
      ))}
      <style jsx>{`
        @keyframes runeFlicker {
          0%,100%{opacity:0.05;transform:scale(1) rotate(0deg);}
          50%{opacity:0.3;transform:scale(1.2) rotate(15deg);}
        }
      `}</style>
    </div>
  );
}

// ─── SCANLINES (Maleficent) ───────────────────────────────────────────────────
function Scanlines() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{
      backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(168,85,247,0.02) 2px,rgba(168,85,247,0.02) 4px)",
      zIndex:1,
    }}/>
  );
}

// ─── THEME CONFIGS ────────────────────────────────────────────────────────────
const CONFIGS = {
  classic: {
    wrapperBg: "bg-[#020617]",
    badge: {
      text: "🏆 REALTIME FOOTBALL CAREER",
      cls: "text-emerald-400 font-black tracking-[0.3em] uppercase text-[11px] font-mono",
    },
    title: {
      text: "FOOTBALL\nMANAGER",
      cls: "font-black tracking-tighter leading-[0.85] text-white uppercase drop-shadow-[0_0_40px_rgba(52,211,153,0.3)]",
      style: { fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(5rem,14vw,11rem)" },
    },
    pill: {
      text: "ENGINE ONLINE · 40+ LEAGUES",
      cls: "bg-emerald-950/80 border border-emerald-700/40 text-emerald-300",
      dot: "bg-emerald-400",
    },
    cards: [
      {
        href: "/leagues",
        wrapCls: "classic-card-left",
        emoji: "⚽",
        title: "Start Career",
        desc: "Manage clubs, transfer markets, and live tactical decisions across 40+ leagues.",
        tag: "SINGLEPLAYER",
        tagCls: "bg-emerald-950 border border-emerald-700/50 text-emerald-400",
        arrowCls: "text-emerald-400",
      },
      {
        href: "/multiplayer",
        wrapCls: "classic-card-right",
        emoji: "📋",
        title: "Tactical Room",
        desc: "Challenge other managers in real-time. Build tactics, scout rivals, dominate the table.",
        tag: "MULTIPLAYER",
        tagCls: "bg-blue-950 border border-blue-700/50 text-blue-400",
        arrowCls: "text-blue-400",
      },
      {
        href: "/dashboard",
        wrapCls: "classic-card-continue",
        emoji: "📂",
        title: "Continue Career",
        desc: "Pick up where you left off. Your club, your squad, your progress — all waiting.",
        tag: "RESUME",
        tagCls: "bg-yellow-950 border border-yellow-700/50 text-yellow-400",
        arrowCls: "text-yellow-400",
      },
    ],
  },
  aurora: {
    wrapperBg: "bg-[#fdf4ff]",
    badge: {
      text: "✦ Realtime Football Career ✦",
      cls: "text-violet-500 font-semibold tracking-[0.2em] uppercase text-xs",
      style: { fontFamily:"'Cormorant Garamond', serif" },
    },
    title: {
      text: "Choose Your\nDream",
      cls: "font-black leading-[0.9] text-transparent bg-clip-text",
      style: {
        fontFamily:"'Fraunces',serif",
        fontSize:"clamp(4rem,12vw,9rem)",
        backgroundImage:"linear-gradient(135deg,#a855f7 0%,#ec4899 40%,#f97316 100%)",
        WebkitBackgroundClip:"text",
        WebkitTextFillColor:"transparent",
      },
    },
    pill: {
      text: "Dream World Ready · All Leagues",
      cls: "bg-white/60 backdrop-blur border border-violet-200 text-violet-700 shadow-sm",
      dot: "bg-pink-400",
    },
    cards: [
      {
        href: "/leagues",
        wrapCls: "aurora-card-left",
        emoji: "⚽",
        title: "Create Career",
        desc: "Begin your magical football journey. Build squads, craft formations, write your legend.",
        tag: "ADVENTURE",
        tagCls: "bg-pink-100 border border-pink-200 text-pink-700",
        arrowCls: "text-pink-500",
      },
      {
        href: "/multiplayer",
        wrapCls: "aurora-card-right",
        emoji: "🌈",
        title: "Join Room",
        desc: "Play with friends in harmony. Trade players, compete for glory, share the dream.",
        tag: "TOGETHER",
        tagCls: "bg-violet-100 border border-violet-200 text-violet-700",
        arrowCls: "text-violet-500",
      },
      {
        href: "/dashboard",
        wrapCls: "aurora-card-continue",
        emoji: "🌸",
        title: "Last Journey",
        desc: "Your dream isn't over. Return to your club and carry on your beautiful story.",
        tag: "RESUME",
        tagCls: "bg-rose-100 border border-rose-200 text-rose-600",
        arrowCls: "text-rose-400",
      },
    ],
  },
  maleficent: {
    wrapperBg: "bg-[#04000a]",
    badge: {
      text: "⛓ MALICIOUS FOOTBALL DOMINANCE",
      cls: "text-fuchsia-400/70 font-light tracking-[0.5em] uppercase text-[10px] font-mono",
    },
    title: {
      text: "CHOOSE\nDOMAIN",
      cls: "font-black leading-[0.85] uppercase tracking-widest",
      style: {
        fontFamily:"'Share Tech Mono',monospace",
        fontSize:"clamp(4rem,12vw,9rem)",
        background:"linear-gradient(180deg,#e879f9 0%,#a855f7 50%,#7c3aed 100%)",
        WebkitBackgroundClip:"text",
        WebkitTextFillColor:"transparent",
        filter:"drop-shadow(0 0 30px rgba(217,70,239,0.4))",
      },
    },
    pill: {
      text: "VOID PROTOCOL ACTIVE",
      cls: "bg-purple-950/60 border border-purple-700/40 text-purple-300 font-mono",
      dot: "bg-fuchsia-500",
    },
    cards: [
      {
        href: "/leagues",
        wrapCls: "mal-card-left",
        emoji: "🖤",
        title: "SEIZE POWER",
        desc: "Begin your ruthless conquest. Crush leagues, break transfer records, leave ruin in your wake.",
        tag: "CAMPAIGN",
        tagCls: "bg-fuchsia-950/80 border border-fuchsia-700/40 text-fuchsia-400 font-mono",
        arrowCls: "text-fuchsia-400",
      },
      {
        href: "/multiplayer",
        wrapCls: "mal-card-right",
        emoji: "🔮",
        title: "ENTER VOID",
        desc: "Summon opponents into your domain. Tactical warfare. No mercy. Only dominance remains.",
        tag: "DOMINATION",
        tagCls: "bg-purple-950/80 border border-purple-700/40 text-purple-400 font-mono",
        arrowCls: "text-purple-400",
      },
      {
        href: "/dashboard",
        wrapCls: "mal-card-continue",
        emoji: "💀",
        title: "LAST SESSION",
        desc: "Your conquest was interrupted. Return. Reassert dominance. Finish what you started.",
        tag: "RESUME",
        tagCls: "bg-yellow-950/80 border border-yellow-700/40 text-yellow-500 font-mono",
        arrowCls: "text-yellow-500",
      },
    ],
  },
};

// ─── CARD ─────────────────────────────────────────────────────────────────────
function Card({ card, theme }: { card: typeof CONFIGS.classic.cards[0]; theme: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={card.href} className="group block h-full">
      <div
        className={`${card.wrapCls} h-full cursor-pointer relative z-10 transition-all duration-400 relative overflow-hidden`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ transform: hovered ? "translateY(-8px) scale(1.02)" : "translateY(0) scale(1)" }}
      >
        {theme === "maleficent" && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage:"linear-gradient(90deg,transparent 0%,rgba(217,70,239,0.03) 50%,transparent 100%)",
              animation:"scanSweep 2s linear infinite",
            }}/>
          </div>
        )}
        <div className="text-6xl mb-6 transition-all duration-400 inline-block"
          style={{ transform: hovered ? "rotate(12deg) scale(1.15)" : "rotate(0deg) scale(1)" }}>
          {card.emoji}
        </div>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest mb-4 uppercase border ${card.tagCls}`}>
          {card.tag}
        </div>
        <h2 className={`card-title-${theme} text-2xl md:text-3xl font-black tracking-tight leading-tight mb-3`}>
          {card.title}
        </h2>
        <p className={`card-desc-${theme} text-sm leading-relaxed`}>{card.desc}</p>
        <div className={`mt-6 flex items-center gap-2 text-sm font-bold tracking-wider uppercase ${card.arrowCls} transition-all duration-300`}
          style={{ transform: hovered ? "translateX(6px)" : "translateX(0)" }}>
          <span>Enter</span>
          <span>→</span>
        </div>
      </div>
    </Link>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const theme = useThemeStore((s) => s.theme) as keyof typeof CONFIGS;
  const cfg = CONFIGS[theme] ?? CONFIGS.classic;
  const [mounted, setMounted] = useState(false);
  const [hasCareer, setHasCareer] = useState(false);
  const initializeTheme = useThemeStore((s) => s.initializeTheme);

  useEffect(() => {
    setMounted(true);
    initializeTheme();
    setHasCareer(!!localStorage.getItem("career_state"));
  }, [initializeTheme]); // stable Zustand ref, safe to add

  return (
    <main className={`min-h-screen relative overflow-hidden ${cfg.wrapperBg} transition-all duration-400`}>
      {/* ── Global styles ── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:opsz,wght@9..144,100..900&family=Cormorant+Garamond:wght@400;600&family=Share+Tech+Mono&display=swap');

        /* ── Classic cards ── */
        .classic-card-left, .classic-card-right {
          background: linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(2,6,23,0.9) 100%);
          border: 1px solid rgba(71,85,105,0.5);
          padding: 2.5rem;
          border-radius: 24px;
          backdrop-filter: blur(20px);
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .classic-card-left:hover { border-color: rgba(52,211,153,0.5); box-shadow: 0 0 40px rgba(52,211,153,0.08), inset 0 0 40px rgba(52,211,153,0.02); }
        .classic-card-right:hover { border-color: rgba(96,165,250,0.5); box-shadow: 0 0 40px rgba(96,165,250,0.08), inset 0 0 40px rgba(96,165,250,0.02); }
        .card-title-classic { color: white; }
        .group:hover .card-title-classic { color: #34d399; }
        .card-desc-classic { color: rgba(148,163,184,0.8); }
        
        .classic-card-continue {
          background: linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(2,6,23,0.9) 100%);
          border: 1px solid rgba(71,85,105,0.5);
          padding: 2.5rem;
          border-radius: 24px;
          backdrop-filter: blur(20px);
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .classic-card-continue:hover {
          border-color: rgba(234,179,8,0.5);
          box-shadow: 0 0 40px rgba(234,179,8,0.08), inset 0 0 40px rgba(234,179,8,0.02);
        }
        

        /* ── Aurora cards ── */
        .aurora-card-left {
          background: rgba(255,255,255,0.55);
          border: 2px solid rgba(244,114,182,0.3);
          padding: 2.5rem;
          border-radius: 32px;
          backdrop-filter: blur(24px);
          box-shadow: 0 8px 32px rgba(236,72,153,0.08), inset 0 1px 0 rgba(255,255,255,0.8);
          transition: border-color 0.3s, box-shadow 0.3s, transform 0.5s;
        }
        .aurora-card-right {
          background: rgba(255,255,255,0.55);
          border: 2px solid rgba(167,139,250,0.3);
          padding: 2.5rem;
          border-radius: 32px;
          backdrop-filter: blur(24px);
          box-shadow: 0 8px 32px rgba(139,92,246,0.08), inset 0 1px 0 rgba(255,255,255,0.8);
          transition: border-color 0.3s, box-shadow 0.3s, transform 0.5s;
        }
        .aurora-card-left:hover { border-color: rgba(244,114,182,0.7); box-shadow: 0 16px 48px rgba(236,72,153,0.2), inset 0 1px 0 rgba(255,255,255,0.8); }
        .aurora-card-right:hover { border-color: rgba(167,139,250,0.7); box-shadow: 0 16px 48px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.8); }
        .card-title-aurora { color: #4c1d95; font-family: 'Fraunces', serif; }
        .card-desc-aurora { color: rgba(76,29,149,0.65); font-family: 'Cormorant Garamond', serif; font-size: 1rem; }

        .aurora-card-continue {
          background: linear-gradient(
            135deg,
            rgba(255,255,255,0.7),
            rgba(255,255,255,0.4)
          );
          border: 2px solid rgba(251,113,133,0.7);
          padding: 2.5rem;
          border-radius: 32px;
          backdrop-filter: blur(28px);
        
          box-shadow:
            0 12px 40px rgba(244,63,94,0.2),
            inset 0 1px 0 rgba(255,255,255,0.9),
            0 0 0 1px rgba(251,113,133,0.3);
        
          transition: border-color 0.3s, box-shadow 0.3s, transform 0.5s;
        }
        
        .aurora-card-continue:hover {
          border-color: rgba(251,113,133,1);
          box-shadow:
            0 20px 60px rgba(244,63,94,0.3),
            inset 0 1px 0 rgba(255,255,255,0.9),
            0 0 0 2px rgba(251,113,133,0.5);
        }
        

        /* ── Maleficent cards ── */
        .mal-card-left, .mal-card-right {
          background: rgba(4,0,10,0.95);
          border: 1px solid rgba(126,34,206,0.3);
          padding: 2.5rem;
          border-radius: 4px;
          font-family: 'Share Tech Mono', monospace;
          position: relative;
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        
        .mal-card-left::after, .mal-card-right::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent);
        }
        .mal-card-left:hover { border-color: rgba(217,70,239,0.5); box-shadow: 0 0 30px rgba(217,70,239,0.12), inset 0 0 30px rgba(217,70,239,0.03); }
        .mal-card-right:hover { border-color: rgba(139,92,246,0.5); box-shadow: 0 0 30px rgba(139,92,246,0.12), inset 0 0 30px rgba(139,92,246,0.03); }
        .card-title-maleficent { color: #e879f9; font-family: 'Share Tech Mono', monospace; letter-spacing: 0.05em; }
        .card-desc-maleficent { color: rgba(216,180,254,0.5); font-family: 'Share Tech Mono', monospace; font-size: 0.8rem; line-height: 1.8; }

        .mal-card-continue {
          background: rgba(4,0,10,0.95);
          border: 1px solid rgba(234,179,8,0.6);
          padding: 2.5rem;
          border-radius: 4px;
          font-family: 'Share Tech Mono', monospace;
          position: relative;
        
          box-shadow:
            0 0 0 1px rgba(234,179,8,0.25),
            0 0 30px rgba(234,179,8,0.15),
            inset 0 0 40px rgba(234,179,8,0.05);
        }
        .mal-card-continue:hover {
          border-color: rgba(234,179,8,1);
          box-shadow:
            0 0 0 1px rgba(234,179,8,0.5),
            0 0 60px rgba(234,179,8,0.3),
            inset 0 0 50px rgba(234,179,8,0.1);
        }
        

        /* ── Scan sweep ── */
        @keyframes scanSweep { from { transform: translateX(-100%); } to { transform: translateX(200%); } }

        /* ── Entry animations ── */
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .anim-in { animation: slideUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .anim-d1 { animation-delay: 0.1s; }
        .anim-d2 { animation-delay: 0.25s; }
        .anim-d3 { animation-delay: 0.4s; }
        .anim-d4 { animation-delay: 0.55s; }
      `}</style>

      {/* ── Backgrounds ── */}
      {mounted && theme === "classic" && <Particles />}
      {mounted && theme === "aurora" && <AuroraBlobs />}
      {mounted && theme === "maleficent" && <><RuneField /><Scanlines /></>}

      {/* ── Classic: subtle grid ── */}
      {theme === "classic" && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{ backgroundImage:"linear-gradient(rgba(52,211,153,1) 1px,transparent 1px),linear-gradient(90deg,rgba(52,211,153,1) 1px,transparent 1px)", backgroundSize:"80px 80px" }} />
      )}

      {/* ── Maleficent: corner accents ── */}
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

      {/* ── Theme toggle ── */}
      <div className="absolute top-5 right-5 z-50"><ThemeToggle /></div>

      {/* ── Content ── */}
      <div key={theme} className="relative z-10 max-w-5xl mx-auto px-6 py-20 min-h-screen flex flex-col justify-center">

        {/* Badge */}
        <div className="flex justify-center mb-6 anim-in anim-d1">
          <span className={cfg.badge.cls} style={(cfg.badge as any).style}>
            {cfg.badge.text}
          </span>
        </div>

        {/* Title */}
        <div className="text-center mb-8 anim-in anim-d2">
          {theme === "maleficent" && (
            <div className="font-mono text-purple-500/30 text-xs tracking-[0.5em] mb-4 uppercase">// SYSTEM INITIALIZED //</div>
          )}
          <h1 className={cfg.title.cls} style={cfg.title.style}>
            {cfg.title.text.split("\n").map((line, i) => (
              <span key={i} className="block">{line}</span>
            ))}
          </h1>
          {theme === "aurora" && (
            <div className="mt-3 text-violet-400/60 italic text-lg" style={{fontFamily:"'Cormorant Garamond',serif"}}>
              Your legend begins here.
            </div>
          )}
        </div>

        {/* Status pill */}
        <div className="flex justify-center mb-16 anim-in anim-d3">
          <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] ${cfg.pill.cls}`}>
            <span className={`w-2 h-2 rounded-full ${cfg.pill.dot} animate-pulse`} />
            {cfg.pill.text}
          </div>
        </div>

        {/* Cards */}
        {/* ── Main cards ── */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full anim-in anim-d4">
            {cfg.cards
              .filter(card => card.href !== "/dashboard")
              .map((card) => (
                <Card key={card.href} card={card} theme={theme} />
              ))}
          </div>

          {/* ── Continue (separate row) ── */}
          {hasCareer && (
            <div className="mt-6 max-w-md mx-auto w-full anim-in anim-d4">
              {cfg.cards
                .filter(card => card.href === "/dashboard")
                .map((card) => (
                  <Card key={card.href} card={card} theme={theme} />
                ))}
            </div>
          )}

        {/* Footer hint */}
        <div className="text-center mt-12 anim-in" style={{ animationDelay: "0.7s" }}>
          {theme === "classic" && (
            <p className="text-slate-600 text-xs font-mono tracking-widest uppercase">
              v0.3.0-alpha · Realtime Football Career
            </p>
          )}
          {theme === "aurora" && (
            <p className="text-violet-400/50 text-xs italic" style={{fontFamily:"'Cormorant Garamond',serif"}}>
              Every great manager started with a single dream.
            </p>
          )}
          {theme === "maleficent" && (
            <p className="text-purple-600/40 text-[10px] font-mono tracking-[0.3em] uppercase">
              &gt;_ AWAITING COMMAND_
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
