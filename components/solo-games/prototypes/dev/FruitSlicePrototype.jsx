import { useCallback, useEffect, useRef, useState } from "react";
import DevPrototypeShell from "./DevPrototypeShell.jsx";

const FRUIT_TYPES = [
  { id: "apple", emoji: "🍎", color: "#ef4444", bad: false },
  { id: "orange", emoji: "🍊", color: "#f97316", bad: false },
  { id: "melon", emoji: "🍉", color: "#22c55e", bad: false },
  { id: "grape", emoji: "🍇", color: "#a855f7", bad: false },
  { id: "bomb", emoji: "💣", color: "#64748b", bad: true },
];

/**
 * @param {{ x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, r: number }} p
 */
function segmentHitsCircle(p) {
  const dx = p.x2 - p.x1;
  const dy = p.y2 - p.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1) {
    const dist = Math.hypot(p.cx - p.x1, p.cy - p.y1);
    return dist <= p.r;
  }
  let t = ((p.cx - p.x1) * dx + (p.cy - p.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const px = p.x1 + t * dx;
  const py = p.y1 + t * dy;
  return Math.hypot(p.cx - px, p.cy - py) <= p.r;
}

export default function FruitSlicePrototype() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const rafRef = useRef(null);
  const fruitsRef = useRef([]);
  const particlesRef = useRef([]);
  const swipeRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const idRef = useRef(0);

  const [score, setScore] = useState(0);
  const [sliced, setSliced] = useState(0);
  const [flash, setFlash] = useState("");

  const spawnFruit = useCallback((w, h) => {
    const roll = Math.random();
    const type =
      roll < 0.12 ? FRUIT_TYPES[4] : FRUIT_TYPES[Math.floor(Math.random() * 4)];
    idRef.current += 1;
    fruitsRef.current.push({
      id: idRef.current,
      type,
      x: 40 + Math.random() * (w - 80),
      y: h + 40,
      vx: (Math.random() - 0.5) * 2.2,
      vy: -(5.5 + Math.random() * 3.5),
      r: type.bad ? 28 : 24 + Math.random() * 10,
      rot: Math.random() * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 0.12,
    });
  }, []);

  const addParticles = (x, y, color, count = 8) => {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 2 + Math.random() * 4;
      particlesRef.current.push({
        id: `${Date.now()}-${i}-${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        color,
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    let lastTs = performance.now();

    const tick = (ts) => {
      const dt = Math.min(32, ts - lastTs);
      lastTs = ts;
      const rect = wrap.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      if (ts - lastSpawnRef.current > 900) {
        spawnFruit(w, h);
        if (Math.random() < 0.45) spawnFruit(w, h);
        lastSpawnRef.current = ts;
      }

      fruitsRef.current = fruitsRef.current.filter((f) => f.y > -120 && f.y < h + 120);
      for (const f of fruitsRef.current) {
        f.x += f.vx * (dt / 16);
        f.y += f.vy * (dt / 16);
        f.vy += 0.18 * (dt / 16);
        f.rot += f.rotSpeed * (dt / 16);
      }

      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx * (dt / 16),
          y: p.y + p.vy * (dt / 16),
          vy: p.vy + 0.12 * (dt / 16),
          life: p.life - 0.03 * (dt / 16),
        }))
        .filter((p) => p.life > 0);

      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(1, "#1e1b4b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(250, 204, 21, 0.35)";
      ctx.lineWidth = 3;
      ctx.strokeRect(8, 8, w - 16, h - 16);

      for (const f of fruitsRef.current) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.beginPath();
        ctx.arc(0, 0, f.r, 0, Math.PI * 2);
        ctx.fillStyle = f.type.bad ? "#334155" : f.type.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = `${Math.round(f.r * 1.1)}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(f.type.emoji, 0, 2);
        ctx.restore();
      }

      for (const p of particlesRef.current) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + p.life * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      const swipe = swipeRef.current;
      if (swipe && swipe.points.length >= 2) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        const pts = swipe.points.slice(-12);
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [spawnFruit]);

  const handleSliceSegment = useCallback((x1, y1, x2, y2) => {
    if (Math.hypot(x2 - x1, y2 - y1) < 6) return;

    const hitIds = new Set();
    for (const f of fruitsRef.current) {
      if (segmentHitsCircle({ x1, y1, x2, y2, cx: f.x, cy: f.y, r: f.r })) {
        hitIds.add(f.id);
      }
    }
    if (!hitIds.size) return;

    let nextSliced = 0;
    let nextScore = 0;
    let badHit = false;

    fruitsRef.current = fruitsRef.current.filter((f) => {
      if (!hitIds.has(f.id)) return true;
      if (f.type.bad) {
        badHit = true;
        addParticles(f.x, f.y, "#ef4444", 12);
        return false;
      }
      nextSliced += 1;
      nextScore += 10;
      addParticles(f.x, f.y, f.type.color, 10);
      return false;
    });

    if (nextSliced) {
      setSliced((s) => s + nextSliced);
      setScore((s) => s + nextScore);
    }
    if (badHit) {
      setFlash("bad");
      window.setTimeout(() => setFlash(""), 400);
    }
  }, []);

  const onPointerDown = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    swipeRef.current = {
      pointerId: e.pointerId,
      points: [{ x: e.clientX - rect.left, y: e.clientY - rect.top }],
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== e.pointerId) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const prev = swipe.points[swipe.points.length - 1];
    swipe.points.push({ x, y });
    if (prev) handleSliceSegment(prev.x, prev.y, x, y);
  };

  const onPointerUp = (e) => {
    if (swipeRef.current?.pointerId === e.pointerId) swipeRef.current = null;
  };

  return (
    <DevPrototypeShell
      title="חיתוך פירות"
      subtitle="אבטיפוס · swipe / חיתוך · ללא ניקוד מלא"
      headerExtra={
        <span className="rounded-lg bg-black/50 px-2 py-1 text-xs font-bold text-amber-200">
          {score} · {sliced}✂️
        </span>
      }
    >
      <div
        ref={wrapRef}
        className={`relative min-h-0 flex-1 overflow-hidden p-2 ${flash === "bad" ? "ring-4 ring-rose-500 ring-inset" : ""}`}
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none rounded-2xl border-4 border-yellow-400 shadow-[0_0_32px_rgba(250,204,21,0.15)]"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <p className="pointer-events-none absolute bottom-4 left-1/2 max-w-[90%] -translate-x-1/2 rounded-lg bg-black/55 px-3 py-1.5 text-center text-[11px] font-semibold text-white/75 sm:text-xs">
          חתכו פירות · הימנעו מ💣 · עכבר או אצבע
        </p>
      </div>
    </DevPrototypeShell>
  );
}
