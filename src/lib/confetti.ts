import { prefersReducedMotion } from '@/lib/motion';

// One-shot confetti burst on a transient, full-screen canvas. No dependencies.
// Respects reduced motion (no-ops) and removes its canvas when the burst ends.

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  size: number;
  color: string;
};

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ec4899'];
const PARTICLE_COUNT = 90;
const GRAVITY = 0.18;
const DRAG = 0.992;
const DURATION_MS = 1600;

export const celebrate = (): void => {
  if (prefersReducedMotion()) return;
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  ctx.scale(dpr, dpr);
  document.body.appendChild(canvas);

  const particles = createParticles(width, height);
  const start = performance.now();

  const frame = (now: number): void => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, width, height);
    const fade = Math.max(0, 1 - elapsed / DURATION_MS);

    for (const p of particles) {
      p.vx *= DRAG;
      p.vy = p.vy * DRAG + GRAVITY;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      drawParticle(ctx, p, fade);
    }

    if (elapsed < DURATION_MS) {
      requestAnimationFrame(frame);

      return;
    }

    canvas.remove();
  };

  requestAnimationFrame(frame);
};

// --- Helpers ---

const createParticles = (width: number, height: number): Particle[] => {
  const particles: Particle[] = [];
  const originX = width / 2;
  const originY = height * 0.32;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.5;
    const speed = 4 + Math.random() * 7;

    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      size: 6 + Math.random() * 6,
      color: COLORS[i % COLORS.length],
    });
  }

  return particles;
};

const drawParticle = (
  ctx: CanvasRenderingContext2D,
  p: Particle,
  fade: number,
): void => {
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.fillStyle = p.color;
  ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
  ctx.restore();
};
