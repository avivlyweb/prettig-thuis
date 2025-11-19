import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

const EASE = [0.16, 1, 0.3, 1]; // Smooth easing curve

export default function CompassPro({ wedges, onSpinStart, onSpinEnd, targetIndex }) {
  const controls = useAnimation();
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [announce, setAnnounce] = useState("");

  const wedgeAngle = 360 / wedges.length;

  const computeDestination = useCallback((currentAngle, targetIdx) => {
    const baseRotations = 5; // full spins for drama
    const targetCenterDeg = targetIdx * wedgeAngle + wedgeAngle / 2;
    // We want the disc to rotate so that targetCenterDeg ends at 0 deg under the needle
    const normalizedCurrent = ((currentAngle % 360) + 360) % 360;
    const deltaToTarget = 360 - targetCenterDeg;
    const total = (baseRotations * 360) + normalizedCurrent + deltaToTarget;
    return total;
  }, [wedgeAngle]);

  const spinTo = useCallback(async (idx) => {
    if (idx == null) return;
    setSpinning(true);
    onSpinStart?.();
    const dest = computeDestination(angle, idx);
    setAnnounce(`Draait naar ${wedges[idx].label}`);
    
    await controls.start({
      rotate: dest,
      transition: { duration: 3.5, ease: EASE }
    });
    
    setAngle(dest);
    setSpinning(false);
    setAnnounce(`Gekozen: ${wedges[idx].label}`);
    onSpinEnd?.(idx);
  }, [angle, computeDestination, controls, onSpinEnd, onSpinStart, wedges]);

  // Auto spin when targetIndex changes
  useEffect(() => {
    if (targetIndex != null) {
      spinTo(targetIndex);
    }
  }, [targetIndex, spinTo]);

  // 3D tilt following pointer
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onMove = (e) => {
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clamp((e.clientX - cx) / rect.width, -0.5, 0.5);
      const dy = clamp((e.clientY - cy) / rect.height, -0.5, 0.5);
      setTilt({ x: dy * 10, y: -dx * 10 });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const ticks = useMemo(() => new Array(36).fill(0).map((_, i) => i), []);

  return (
    <div className="w-full max-w-md select-none" aria-live="polite">
      <div className="sr-only" aria-live="assertive">{announce}</div>
      <div className="relative" ref={ref}>
        <motion.div
          className="relative mx-auto"
          style={{ width: 360, height: 360, perspective: 900 }}
        >
          {/* Disc */}
          <motion.div
            animate={controls}
            initial={{ rotate: 0 }}
            className="w-[360px] h-[360px] rounded-full shadow-2xl border border-white/40"
            style={{
              transformStyle: "preserve-3d",
              rotateX: tilt.x,
              rotateY: tilt.y,
              background: "radial-gradient(150px 150px at 50% 40%, rgba(255,255,255,0.65), rgba(248,250,252,0.9)), radial-gradient(circle at 50% 50%, rgba(15,23,42,0.03), rgba(15,23,42,0.06))",
            }}
          >
            {/* Wedges */}
            {wedges.map((w, i) => (
              <Wedge key={w.key} index={i} total={wedges.length} color={w.color} label={w.label} />
            ))}

            {/* Tick marks */}
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute left-1/2 top-1/2 origin-left"
                style={{
                  transform: `rotate(${t * 10}deg) translateX(150px)`,
                }}
              >
                <div
                  className={`h-[2px] ${t % 9 === 0 ? "w-8 bg-slate-400/60" : "w-4 bg-slate-300/60"}`}
                />
              </div>
            ))}

            {/* Center hub */}
            <div className="absolute inset-0 grid place-items-center">
              <div className="w-24 h-24 rounded-full bg-white shadow-xl border border-slate-200" />
            </div>

            {/* Needle shadow */}
            <div className="absolute inset-0 grid place-items-start" style={{ transform: 'translateZ(1px)' }}>
              <div className="w-1 left-1/2 -translate-x-1/2 h-[170px] rounded-b-full bg-black/10 blur-[2px]" />
            </div>

            {/* Needle */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[140px]" style={{ transform: 'translateZ(2px)' }}>
              <div className="w-2 h-36 bg-gradient-to-b from-slate-700 to-slate-900 rounded-full shadow-lg" />
            </div>

            {/* North marker */}
            <div className="absolute left-1/2 -translate-x-1/2 top-2 text-xs font-semibold text-slate-600">N</div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function Wedge({ index, total, color, label }) {
  const sweep = 360 / total;
  const start = index * sweep;
  const end = start + sweep;

  const r = 170;
  const cx = 180;
  const cy = 180;
  const startRad = (Math.PI / 180) * (start - 90);
  const endRad = (Math.PI / 180) * (end - 90);
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = sweep > 180 ? 1 : 0;

  const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

  return (
    <svg className="absolute inset-0" width={360} height={360} aria-hidden>
      <path d={path} fill={color} opacity={0.18} />
      <path d={path} fill={`url(#grad-${index})`} opacity={0.65} />
      <defs>
        <radialGradient id={`grad-${index}`} cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.65" />
        </radialGradient>
      </defs>
      <text
        x={180}
        y={180}
        transform={`rotate(${start + sweep / 2} 180 180) translate(0 -110)`}
        textAnchor="middle"
        className="fill-slate-800"
        style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
      >
        {label}
      </text>
    </svg>
  );
}