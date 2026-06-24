"use client";
import { useEffect, useRef } from "react";
import HeroTypewriter from "./HeroTypewriter";

// Subtle floating orbs rendered on canvas — no layout impact
function OrbCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const orbs = Array.from({ length: 5 }, (_, i) => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      r: 160 + Math.random() * 120,
      dx: (Math.random() - 0.5) * 0.18,
      dy: (Math.random() - 0.5) * 0.18,
      hue: [42, 172, 220, 280, 0][i], // gold, teal, blue, purple, clay
      alpha: 0.04 + Math.random() * 0.04,
    }));

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const o of orbs) {
        o.x += o.dx;
        o.y += o.dy;
        if (o.x < -o.r) o.x = canvas.width + o.r;
        if (o.x > canvas.width + o.r) o.x = -o.r;
        if (o.y < -o.r) o.y = canvas.height + o.r;
        if (o.y > canvas.height + o.r) o.y = -o.r;

        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        g.addColorStop(0, `hsla(${o.hue}, 70%, 60%, ${o.alpha})`);
        g.addColorStop(1, `hsla(${o.hue}, 70%, 60%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}

interface HeroSectionProps {
  searchBar: React.ReactNode;
}

export default function HeroSection({ searchBar }: HeroSectionProps) {
  return (
    <div className="bg-ink-950 relative overflow-hidden">
      {/* Animated orb background */}
      <OrbCanvas />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden="true"
      />

      {/* Radial vignette so grid fades at edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, #0C1226 100%)",
        }}
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center relative z-10">
        {/* Eyebrow pill */}
        <div className="inline-flex items-center gap-2 bg-ink-900/80 border border-ink-700 backdrop-blur-sm rounded-full px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />
          <span className="font-mono-label text-[11px] tracking-[0.2em] uppercase text-gold-500">
            Admissions, decoded
          </span>
        </div>

        {/* Animated headline */}
        <HeroTypewriter />

        {/* Subtext */}
        <p className="text-ink-200 text-lg mt-6 mb-10 max-w-xl mx-auto leading-relaxed">
          Compare fees, ranks, and placements across{" "}
          <span className="text-paper font-semibold">470+ institutes</span> in India.
          <br className="hidden sm:block" />
          Your dream college is one search away.
        </p>

        {/* Search bar slot */}
        <div className="flex justify-center">{searchBar}</div>

        {/* Trust stats */}
        <div className="mt-10 flex items-center justify-center gap-8 sm:gap-12 flex-wrap">
          {[
            { value: "470+", label: "Colleges" },
            { value: "NIRF 2024", label: "Data source" },
            { value: "Free", label: "Always" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="font-display text-xl font-semibold text-paper">{value}</p>
              <p className="font-mono-label text-[11px] tracking-widest uppercase text-ink-400 mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade into page background */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--color-paper))",
        }}
        aria-hidden="true"
      />
    </div>
  );
}