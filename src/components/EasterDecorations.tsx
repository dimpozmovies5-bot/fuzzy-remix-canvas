const symbols = [
  { emoji: "💖", top: "10%", left: "3%", size: "text-2xl", anim: "sky-float", delay: "0s" },
  { emoji: "💕", top: "20%", right: "4%", size: "text-xl", anim: "sky-pulse", delay: "1s" },
  { emoji: "🌹", bottom: "25%", left: "2%", size: "text-lg", anim: "sky-float", delay: "0.5s" },
  { emoji: "💗", top: "50%", right: "3%", size: "text-lg", anim: "sky-pulse", delay: "2s" },
  { emoji: "✨", top: "70%", left: "4%", size: "text-xl", anim: "sky-float", delay: "1.5s" },
  { emoji: "💝", bottom: "15%", right: "5%", size: "text-2xl", anim: "sky-float", delay: "0.8s" },
];

export default function EasterDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden hidden md:block">
      {symbols.map((s, i) => (
        <span
          key={i}
          className={`absolute ${s.size} ${s.anim} opacity-20 select-none`}
          style={{
            top: s.top,
            left: s.left,
            right: s.right,
            bottom: s.bottom,
            animationDelay: s.delay,
          }}
        >
          {s.emoji}
        </span>
      ))}
    </div>
  );
}
