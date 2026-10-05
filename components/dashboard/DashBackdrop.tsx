"use client";
// Фон дашборда: у каждой темы свой характер, а не просто размытые пятна.
//  classic    — «стадионные огни»: цвет клуба + тонкая сетка газона;
//  aurora     — пастельная сетка-градиент + мерцающие ✦;
//  maleficent — тёмная сетка, сканлайны и пурпурное свечение снизу.
export function DashBackdrop({ theme, glowColor }: { theme: string; glowColor: string }) {
  if (theme === "aurora") {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 15% 0%, rgba(244,114,182,0.22), transparent 70%), radial-gradient(50% 45% at 90% 20%, rgba(167,139,250,0.22), transparent 70%), radial-gradient(60% 50% at 50% 100%, rgba(251,207,232,0.5), transparent 70%)" }} />
        {[ [8, 12, 14], [88, 8, 10], [70, 70, 16], [20, 82, 12], [48, 30, 9], [95, 55, 13] ].map(([x, y, s], i) => (
          <span key={i} className="absolute animate-floaty-sm select-none" style={{ left: `${x}%`, top: `${y}%`, fontSize: s, color: i % 2 ? "#c4b5fd" : "#f9a8d4", animationDelay: `${i * -0.7}s`, opacity: 0.7 }}>✦</span>
        ))}
      </div>
    );
  }
  if (theme === "maleficent") {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(168,85,247,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.06) 1px, transparent 1px)", backgroundSize: "44px 44px", maskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 75%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-[45%]" style={{ background: "radial-gradient(60% 100% at 50% 100%, rgba(217,70,239,0.16), transparent 70%)" }} />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 1px, transparent 3px)" }} />
      </div>
    );
  }
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-[-25%] left-[-10%] w-[700px] h-[700px] rounded-full blur-[160px] animate-floaty" style={{ backgroundColor: `${glowColor}14` }} />
      <div className="absolute bottom-[-20%] right-[-8%] w-[480px] h-[480px] rounded-full blur-[130px] animate-floaty" style={{ backgroundColor: `${glowColor}0c`, animationDelay: "-2s", animationDuration: "6s" }} />
      <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(ellipse at 30% 20%, black 10%, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at 30% 20%, black 10%, transparent 70%)" }} />
    </div>
  );
}
export default DashBackdrop;
