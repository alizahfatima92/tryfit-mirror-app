import { useCallback, useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Camera, SwitchCamera, Loader2, AlertTriangle, Sparkles, Shield } from 'lucide-react';
import { ACCESSORIES, type AccessoryKind } from './accessories';

type Vec = { x: number; y: number };

// Key MediaPipe FaceLandmarker indices (canonical 468-point model)
const LM = {
  leftEyeOuter: 33,
  rightEyeOuter: 263,
  leftEyeInner: 133,
  rightEyeInner: 362,
  leftEar: 234,
  rightEar: 454,
  chin: 152,
};

function mid(a: Vec, b: Vec): Vec {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function angleDeg(a: Vec, b: Vec): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}
function toPx(v: Vec, w: number, h: number): Vec {
  return { x: v.x * w, y: v.y * h };
}

interface Placement {
  width: number;
  height: number;
  left: number;
  top: number;
  rotate: number;
}

function placementFor(
  kind: AccessoryKind,
  landmarks: { x: number; y: number; z?: number }[],
  vw: number,
  vh: number
): Placement | null {
  const lm = (i: number): Vec => ({ x: landmarks[i].x, y: landmarks[i].y });

  if (kind === 'glasses') {
    const lo = toPx(lm(LM.leftEyeOuter), vw, vh);
    const ro = toPx(lm(LM.rightEyeOuter), vw, vh);
    const li = toPx(lm(LM.leftEyeInner), vw, vh);
    const ri = toPx(lm(LM.rightEyeInner), vw, vh);
    const center = mid(mid(lo, li), mid(ro, ri));
    const eyeSpan = dist(lo, ro);
    const w = eyeSpan * 2.4;
    const h = (w * 120) / 320;
    return {
      width: w,
      height: h,
      left: center.x - w / 2,
      top: center.y - h / 2,
      rotate: angleDeg(lo, ro),
    };
  }
  if (kind === 'earrings') {
    const le = toPx(lm(LM.leftEar), vw, vh);
    const re = toPx(lm(LM.rightEar), vw, vh);
    const earSpan = dist(le, re);
    const w = earSpan * 0.95;
    const h = (w * 260) / 200;
    const center = mid(le, re);
    const tilt = (le.y - re.y) * 2;
    return {
      width: w,
      height: h,
      left: center.x - w / 2,
      top: center.y - h * 0.15,
      rotate: tilt,
    };
  }
  if (kind === 'necklace') {
    const le = toPx(lm(LM.leftEar), vw, vh);
    const re = toPx(lm(LM.rightEar), vw, vh);
    const chin = toPx(lm(LM.chin), vw, vh);
    const earSpan = dist(le, re);
    const w = earSpan * 1.6;
    const h = (w * 220) / 360;
    const center = mid(le, re);
    const drop = dist(chin, center) * 0.3;
    return {
      width: w,
      height: h,
      left: center.x - w / 2,
      top: chin.y - h * 0.05 + drop,
      rotate: angleDeg(le, re),
    };
  }
  return null;
}

export default function VirtualMirror() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  // Keep the active kinds in a ref so the rAF loop always reads the latest value
  // without needing to restart the loop on every toggle.
  const activeKindsRef = useRef<Set<AccessoryKind>>(new Set(['glasses']));
  // Refs to each accessory wrapper div, keyed by kind, for direct DOM updates.
  const wrapRefs = useRef<Partial<Record<AccessoryKind, HTMLDivElement | null>>>({});

  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [activeKinds, setActiveKinds] = useState<Set<AccessoryKind>>(new Set(['glasses']));
  const [status, setStatus] = useState<'idle' | 'loading' | 'running' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [landmarkCount, setLandmarkCount] = useState(0);

  // Sync the ref whenever the React state changes.
  useEffect(() => {
    activeKindsRef.current = activeKinds;
  }, [activeKinds]);

  const toggleKind = (k: AccessoryKind) => {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  // Initialize the FaceLandmarker model once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        const lm = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
        });
        if (cancelled) {
          lm.close();
          return;
        }
        landmarkerRef.current = lm;
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(e instanceof Error ? e.message : 'Failed to load face model');
        }
      }
    })();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const v = videoRef.current;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
    // Hide all accessory wrappers
    for (const el of Object.values(wrapRefs.current)) {
      if (el) el.style.display = 'none';
    }
    setStatus('idle');
    setLandmarkCount(0);
  }, []);

  const startCamera = useCallback(async () => {
    if (!landmarkerRef.current) {
      setStatus('loading');
      return;
    }
    try {
      setStatus('loading');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      setStatus('running');
      runningRef.current = true;

      const loop = () => {
        if (!runningRef.current) return;
        const v = videoRef.current;
        const lm = landmarkerRef.current;
        const container = containerRef.current;
        if (!v || !lm || !container || !v.videoWidth) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        const now = performance.now();
        const result = lm.detectForVideo(v, now);
        const vw = v.videoWidth;
        const vh = v.videoHeight;

        // Scale factor from video resolution to displayed container size
        const rect = container.getBoundingClientRect();
        const scaleX = rect.width / vw;
        const scaleY = rect.height / vh;

        const hasFace = result.faceLandmarks && result.faceLandmarks.length > 0;
        if (hasFace) {
          const pts = result.faceLandmarks[0];
          if (pts.length !== landmarkCount) setLandmarkCount(pts.length);
          const active = activeKindsRef.current;
          for (const asset of ACCESSORIES) {
            const el = wrapRefs.current[asset.kind];
            if (!el) continue;
            if (!active.has(asset.kind)) {
              el.style.display = 'none';
              continue;
            }
            const p = placementFor(asset.kind, pts, vw, vh);
            if (!p) {
              el.style.display = 'none';
              continue;
            }
            el.style.display = 'block';
            el.style.width = `${p.width * scaleX}px`;
            el.style.height = `${p.height * scaleY}px`;
            el.style.left = `${p.left * scaleX}px`;
            el.style.top = `${p.top * scaleY}px`;
            el.style.transform = `rotate(${p.rotate}deg)`;
          }
        } else {
          if (landmarkCount !== 0) setLandmarkCount(0);
          for (const el of Object.values(wrapRefs.current)) {
            if (el) el.style.display = 'none';
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      setStatus('error');
      setErrorMsg(
        e instanceof Error
          ? e.message
          : 'Could not access the camera. Please allow camera permission.'
      );
    }
  }, [facing, landmarkCount]);

  const flipCamera = useCallback(async () => {
    if (status !== 'running') return;
    stopCamera();
    setFacing((f) => (f === 'user' ? 'environment' : 'user'));
    setTimeout(() => startCamera(), 150);
  }, [status, stopCamera, startCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const mirrored = facing === 'user';

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Mirror viewport */}
      <div
        ref={containerRef}
        className="relative w-full max-w-2xl aspect-[4/3] rounded-3xl overflow-hidden bg-purple-900 shadow-2xl shadow-purple-500/30 ring-4 ring-white/60"
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
        />

        {/* Accessory overlay layer — mirrored to match front camera */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
        >
          {ACCESSORIES.map((asset) => {
            const visible = activeKinds.has(asset.kind);
            return (
              <div
                key={asset.kind}
                ref={(el) => {
                  wrapRefs.current[asset.kind] = el;
                }}
                className="absolute"
                style={{
                  display: visible ? 'block' : 'none',
                  transformOrigin: 'center center',
                  willChange: 'transform, left, top, width, height',
                }}
              >
                {asset.render({ width: '100%', height: '100%' })}
              </div>
            );
          })}
        </div>

        {/* Status overlays */}
        {status !== 'running' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-purple-800/90 to-pink-700/90 backdrop-blur-sm animate-fade-in">
            {status === 'error' ? (
              <>
                <AlertTriangle className="w-12 h-12 text-pink-300" />
                <p className="text-center text-pink-100 max-w-xs px-6 text-sm">{errorMsg}</p>
                <button className="btn-primary" onClick={startCamera}>
                  Try Again
                </button>
              </>
            ) : status === 'loading' ? (
              <>
                <Loader2 className="w-12 h-12 text-pink-300 animate-spin" />
                <p className="text-pink-100 font-display">Loading your mirror…</p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center animate-pulse-soft">
                  <Camera className="w-10 h-10 text-pink-200" />
                </div>
                <p className="text-white font-display text-lg">Tap to start your mirror</p>
                <p className="text-pink-200 text-sm max-w-xs text-center px-6">
                  We'll use your camera to track your face and place accessories in real time.
                </p>
                <button className="btn-primary" onClick={startCamera}>
                  <Sparkles className="w-5 h-5" /> Start Mirror
                </button>
              </>
            )}
          </div>
        )}

        {/* Live badge */}
        {status === 'running' && (
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur">
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
            <span className="text-white text-xs font-medium tracking-wide">LIVE</span>
            {landmarkCount > 0 && (
              <span className="text-pink-200 text-xs">· {landmarkCount} pts</span>
            )}
          </div>
        )}

        {/* Flip button */}
        {status === 'running' && (
          <button
            onClick={flipCamera}
            className="absolute top-3 right-3 rounded-full bg-black/40 p-2.5 backdrop-blur transition hover:bg-black/60 active:scale-90"
            aria-label="Flip camera"
          >
            <SwitchCamera className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Accessory picker */}
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-display font-semibold text-purple-800 text-lg">Accessories</h3>
          <span className="text-sm text-purple-400">{activeKinds.size} active</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {ACCESSORIES.map((a) => {
            const on = activeKinds.has(a.kind);
            return (
              <button
                key={a.kind}
                onClick={() => toggleKind(a.kind)}
                className={[
                  'group relative flex flex-col items-center gap-2 rounded-2xl p-4 transition-all active:scale-95',
                  on
                    ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30'
                    : 'bg-white/80 text-purple-700 hover:bg-white hover:shadow-md',
                ].join(' ')}
              >
                <span className="text-2xl">{a.emoji}</span>
                <span className="font-display font-medium text-sm">{a.label}</span>
                {on && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-sm text-purple-400">
          Tap an accessory to toggle it on or off. Combine multiple at once!
        </p>
        <p className="mt-1.5 text-center text-xs text-purple-300 flex items-center justify-center gap-1">
          <Shield className="w-3 h-3" /> Your camera never leaves your device — all tracking happens in your browser.
        </p>
      </div>

      {/* Stop button */}
      {status === 'running' && (
        <button className="btn-ghost" onClick={stopCamera}>
          Stop Mirror
        </button>
      )}
    </div>
  );
}
