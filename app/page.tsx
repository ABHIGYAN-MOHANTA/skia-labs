'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { CanvasKit, RuntimeEffect, Shader } from 'canvaskit-wasm';

const heroShaderCode = `// kind=shader
// Skia Labs provides iTime (seconds) and iResolution (width,height); keep these uniform.
uniform float iTime;
uniform float2 iResolution;
half4 main(float2 fragCoord) {
    float2 uv = fragCoord / iResolution.xy;
    float pattern = sin(uv.x * 20.0 + iTime) * cos(uv.y * 20.0 + iTime);
    float gradient = uv.x;
    float combined = pattern * gradient;
    float3 col = float3(combined);

    // reduce brightness so the hero text remains readable
    col *= 0.5;

    return half4(col, 1.0);
}`;

const shaderExamples = [
  {
    title: 'Color Waves',
    code: `// kind=shader
// Skia Labs provides iTime (seconds) and iResolution (width,height); keep these uniform.
uniform float iTime;
uniform float2 iResolution;
half4 main(float2 fragCoord) {
    float2 uv = fragCoord / iResolution.xy;
    float3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + float3(0, 2, 4));
    col *= 0.6;
    return half4(col, 1.0);
}`
  },
  {
    title: 'Pattern Gradient',
    code: `// kind=shader
// Skia Labs provides iTime (seconds) and iResolution (width,height); keep these uniform.
uniform float iTime;
uniform float2 iResolution;
half4 main(float2 fragCoord) {
    float2 uv = fragCoord / iResolution.xy;
    float pattern = sin(uv.x * 20.0 + iTime) * cos(uv.y * 20.0 + iTime);
    float gradient = uv.x;
    float combined = pattern * gradient;
    float3 col = float3(combined);
    col *= 0.5;
    return half4(col, 1.0);
}`
  },
  {
    title: 'Psychedelic Tunnel',
    code: `// kind=shader
// Skia Labs provides iTime (seconds) and iResolution (width,height); keep these uniform.
uniform float iTime;
uniform float2 iResolution;
half4 main(float2 fragCoord) {
    float2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);
    float depth = 1.0 / (dist + 0.1) - iTime * 2.0;
    float spiral = sin(angle * 5.0 + depth * 3.0);
    float rings = sin(depth * 10.0) * 0.5 + 0.5;
    float3 col = float3(
        0.5 + 0.5 * sin(depth + angle + iTime),
        0.5 + 0.5 * sin(depth * 2.0 - angle + iTime * 1.5),
        0.5 + 0.5 * sin(depth * 3.0 + angle * 2.0 - iTime * 2.0)
    );
    col *= (spiral * 0.3 + 0.7) * (rings * 0.5 + 0.5);
    col *= 1.0 - dist * 0.5;

    col *= 0.6;

    return half4(col, 1.0);
}`
  }, {
    title: 'Cloudy Sky',
    code: `// kind=shader
uniform float iTime;
uniform float2 iResolution;

// --- Simple smooth noise ---
float hash(float2 p) {
    return fract(sin(dot(p, float2(23.43, 89.19))) * 45245.233);
}

float noise(float2 p) {
    float2 i = floor(p);
    float2 f = fract(p);

    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + float2(1.0, 0.0));
    float c = hash(i + float2(0.0, 1.0));
    float d = hash(i + float2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// --- FBM clouds ---
float fbm(float2 p) {
    float f = 0.0;
    float amp = 0.5;

    for (int i = 0; i < 5; i++) {
        f += noise(p) * amp;
        p *= 2.0;
        amp *= 0.5;
    }
    return f;
}

half4 main(float2 fragCoord) {
    float2 uv = fragCoord / iResolution.xy;

    // Center & aspect-correct
    uv = uv * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    // Base sky gradient
    float3 col = mix(
        float3(0.15, 0.25, 0.45), // top
        float3(0.7, 0.85, 1.0),   // near horizon
        smoothstep(-1.2, 0.6, uv.y)
    );

    // Cloud layer
    float time = iTime * 0.03;
    float clouds = fbm(uv * 1.9 + float2(time, 0.0));

    // Thickness mask
    float cMask = smoothstep(0.4, 0.75, clouds);

    // Soft white clouds
    col = mix(col, float3(1.0, 1.0, 1.0), cMask * 0.6);

    // Sun glow
    float2 sunDir = float2(0.3, 0.5);
    float d = length(uv - sunDir);
    float glow = exp(-d * 4.0);
    col += float3(1.2, 1.0, 0.8) * glow * 0.3;

    return half4(col, 1.0);
}
`
  }, {
    title: 'Tech Tunnel',
    code: `// kind=shader
uniform float iTime;
uniform float2 iResolution;

// Helpers
float3 P(float z) {
    float2 c = float2(cos(z * 0.1), cos(z * 0.12)) * 12.0;
    return float3(c.x, c.y, z);
}

float A(float F, float H, float K, float3 p) {
    return abs(dot(sin(p * (F * K)), float3(H))) / K;
}

// SKSL does not allow arrays → emulate with functions
float getScale(int idx) {
    if (idx == 0) return 0.6;
    if (idx == 1) return 1.0;
    if (idx == 2) return 1.8;
    if (idx == 3) return 3.2;
    return 6.0;
}

float getOffset(int idx) {
    if (idx == 0) return 0.6;
    if (idx == 1) return 0.2;
    if (idx == 2) return -0.05;
    if (idx == 3) return -0.35;
    return -0.7;
}

half4 main(float2 fragCoord) {
    float2 r = iResolution;
    float2 u = (fragCoord - r * 0.5) / r.y;

    // cinematic bars
    if (abs(u.y) > 0.375) return half4(0.0);

    float time = iTime;
    float T = time * 4.0 + 5.0 + 5.0 * sin(time * 0.3);

    float3 p = P(T);
    float3 Z = normalize(P(T + 4.0) - p);
    float3 X = normalize(float3(Z.z, 0.0, -Z.x));

    float3 bx = -X;
    float3 by = normalize(cross(X, Z));
    float3 bz = Z;

    float3 D = u.x * bx + u.y * by + 1.0 * bz;

    float3 colAccum = float3(0.0);

    float d = 0.0;
    float s = 0.0;
    float e = 0.0;
    float t = 0.0;

    // FOR LOOP (SKSL-compatible)
    for (int iter = 0; iter < 28; iter++) {

        if (d >= 30.0) break;

        p += D * s;

        float3 path = P(p.z);
        t = sin(time);

        float3 orb = float3(
            path.x + t,
            path.y + t * 2.0,
            6.0 + T + t * 2.0
        );

        e = length(p - orb) - 0.01;

        float r1 = length(p.xy - float2(path.x + 6.0, 0.0));
        float r2 = length((p - path).xy);

        float baseTunnel = cos(p.z * 0.6) * 2.0 + 4.0 - min(r1, r2);
        float noiseLarge = A(4.0, 0.25, 0.1, p);
        float noiseDetail = A(T + 8.0, 0.22, 2.0, p);

        float sCandidate = baseTunnel + noiseLarge + noiseDetail;

        float stepVal = min(e, 0.01 + 0.3 * abs(sCandidate));
        d += stepVal;
        s = stepVal;

        float safe = max(s, 1e-6);

        colAccum += 1.0 / safe + float3(10.0, 20.0, 50.0) / max(e, 0.6);
    }

    float3 col = (colAccum * colAccum) / 1e6;
    return half4(col, 1.0);
}
`
  }, {
    title: 'Desert Dunes',
    code: `// kind=shader
uniform float iTime;
uniform float2 iResolution;

// --- utils ---
float2 rot(float2 p, float a) {
    float c = cos(a), s = sin(a);
    return float2(p.x*c - p.y*s, p.x*s + p.y*c);
}

float hash21(float2 p) {
    return fract(sin(dot(p, float2(127.1,311.7))) * 43758.5453);
}

float noise(float2 p) {
    float2 i = floor(p);
    float2 f = fract(p);
    f = f*f*(3.0 - 2.0*f);
    float a = hash21(i);
    float b = hash21(i + float2(1.0,0.0));
    float c = hash21(i + float2(0.0,1.0));
    float d = hash21(i + float2(1.0,1.0));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

float fbm(float2 p) {
    float v = 0.0;
    float amp = 0.55;
    p *= 0.8;
    for (int i = 0; i < 5; i++) {
        v += noise(p) * amp;
        p *= 2.0;
        amp *= 0.5;
    }
    return v;
}

float ridge(float2 p) {
    float v = fbm(p * 2.0);
    v += fbm(p * 5.7) * 0.5;
    return 1.0 - abs(2.0 * fract(v) - 1.0);
}

float haze(float dist, float height) {
    float f = exp(-dist * 0.12) * smoothstep(-1.2, 0.8, height);
    return clamp(1.0 - f, 0.0, 1.0);
}

// --- main ---
half4 main(float2 fragCoord) {

    float2 uv = fragCoord / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;

    float2 p = uv*2.0 - 1.0;
    p.x *= aspect;

    float t = iTime * 0.06;

    // === BRIGHT SKY ===
    float3 skyTop = float3(0.22,0.42,0.75);   // brighter blue
    float3 skyMid = float3(1.00,0.76,0.45);   // bright peach
    float skyBlend = smoothstep(1.0,-0.2,p.y);
    float3 col = mix(skyTop, skyMid, skyBlend) * 1.25;  // boosted brightness

    // === STRONGER SUN ===
    float2 sunPos = float2(0.45,-0.15);
    sunPos.x *= aspect;
    float2 sunUV = p - sunPos;
    float sunDist = length(sunUV);
    float sunGlow = exp(-sunDist * 5.0);
    col += float3(1.6,1.35,1.1) * sunGlow;   // brighter sun

    // === SOFT HOT RAYS ===
    float ray = max(0.0, 0.35 - abs(sunUV.y)*0.3);
    col += float3(1.3,1.1,0.8) * ray * 0.12;

    // === DUNE LAYERS (brightened) ===
    const int LAYERS = 5;

    float scales[5];
    scales[0]=0.6; scales[1]=1.0; scales[2]=1.8; scales[3]=3.2; scales[4]=6.0;

    float offsets[5];
    offsets[0]=0.4; offsets[1]=0.05; offsets[2]=-0.1; offsets[3]=-0.45; offsets[4]=-0.8;

    float speeds[5];
    speeds[0]=0.02; speeds[1]=0.06; speeds[2]=0.12; speeds[3]=0.22; speeds[4]=0.35;

    float amps[5];
    amps[0]=0.20; amps[1]=0.42; amps[2]=0.70; amps[3]=0.95; amps[4]=1.45;

    float3 dunes = float3(0.0);
    float totalDepth = 0.0;

    for (int i = 0; i < LAYERS; i++) {
        float s = scales[i];
        float yOff = offsets[i];
        float sp = speeds[i];
        float amp = amps[i];

        float2 coord = (p + float2(t*sp*(0.5+float(i)*0.12),0.0)) * float2(s, s*0.6);
        coord = rot(coord, 0.12 * float(i));

        float base = fbm(coord * 0.8) * 0.8;
        float ridg = ridge(coord * 4.0) * 0.18;
        float height = yOff + base * amp + ridg;

        float mask = smoothstep(height - 0.12, height + 0.08, -p.y);

        float depth = float(i)/float(LAYERS-1);
        float fog = mix(1.0,0.35,depth);

        float3 sandBase = float3(1.10,0.92,0.67);   // brighter sand
        float3 sandShade = float3(0.55,0.42,0.28);  // lighter shadows

        float lit = 0.35 + 0.65 * clamp(dot(normalize(float3(0.0,1.0,0.1)), 
                                        normalize(float3(sunPos.xy,-0.8))),
                                        0.0, 1.0);

        float3 layerColor = mix(sandShade, sandBase, lit);

        float crest = smoothstep(0.02,0.18,ridg);
        layerColor += crest * float3(1.2,1.0,0.75) * 0.18;

        dunes += layerColor * mask * fog;
        totalDepth += mask * fog;
    }

    if (totalDepth > 0.0) dunes /= totalDepth;

    // bright horizon blend
    float horizonFog = smoothstep(-0.4,0.3,p.y);
    float duneMix = clamp(1.0 - horizonFog*0.05, 0.0, 1.0);

    float3 scene = mix(col, dunes, duneMix);

    // add subtle sparkle
    float2 glintUV = p * float2(12.0,6.0) + float2(t*0.8,0.0);
    float g = fbm(glintUV)*0.5 + ridge(glintUV*3.0)*0.35;
    scene += float3(1.0,0.9,0.7) * pow(clamp(g,0.0,1.0), 3.0) * 0.08;

    // gentle tone mapping (brighter)
    scene = pow(scene, float3(0.85));

    // reduce vignette darkness drastically
    float vign = smoothstep(1.45, 0.55, length(p));
    scene *= (0.85 + 0.15 * vign);

    // tiny grain
    float grain = (hash21(fragCoord.xy*0.5)-0.5)*0.02;
    scene += grain;

    return half4(clamp(scene,0.0,1.0), 1.0);
}`
  },
];

function ShaderPreview({ code }: { code: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasKit, setCanvasKit] = useState<CanvasKit | null>(null);

  useEffect(() => {
    const globalWin = window as unknown as { CanvasKitLoaded?: CanvasKit };
    if (globalWin.CanvasKitLoaded) {
      setTimeout(() => setCanvasKit(globalWin.CanvasKitLoaded ?? null), 0);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/canvaskit-wasm@latest/bin/canvaskit.js';
    script.onload = () => {
      (window as unknown as {
        CanvasKitInit?: (opts: { locateFile: (file: string) => string }) => Promise<CanvasKit>;
        CanvasKitLoaded?: CanvasKit;
      }).CanvasKitInit?.({
        locateFile: (file: string) => 'https://unpkg.com/canvaskit-wasm@latest/bin/' + file
      }).then((ck: CanvasKit) => {
        (window as unknown as { CanvasKitLoaded?: CanvasKit }).CanvasKitLoaded = ck;
        setCanvasKit(ck);
      });
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!canvasKit || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const surface = canvasKit.MakeCanvasSurface(canvas);
    if (!surface) return;

    let effect: RuntimeEffect | null = null;
    let shader: Shader | null = null;
    let animationId: number | null = null;
    let isActive = true;
    const startTime = Date.now();

    try {
      effect = canvasKit.RuntimeEffect.Make(code);
      if (!effect) return;

      const draw = () => {
        if (!isActive || !effect) return;

        try {
          const skcanvas = surface.getCanvas();
          const paint = new canvasKit.Paint();
          const currentTime = (Date.now() - startTime) / 1000;
          const uniforms = new Float32Array([
            currentTime,
            canvas.width,
            canvas.height
          ]);

          if (shader) {
            shader.delete();
            shader = null;
          }

          shader = effect.makeShader(uniforms);
          paint.setShader(shader);

          skcanvas.clear(canvasKit.WHITE);
          skcanvas.drawPaint(paint);
          surface.flush();

          paint.delete();

          if (isActive) {
            animationId = requestAnimationFrame(draw);
          }
        } catch {
          isActive = false;
        }
      };

      draw();
    } catch {
      console.error('Shader error');
    }

    return () => {
      isActive = false;
      if (animationId !== null) cancelAnimationFrame(animationId);
      if (shader) shader.delete();
      if (effect) effect.delete();
      surface.delete();
    };
  }, [canvasKit, code]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={300}
      className="w-full h-full object-cover"
    />
  );
}

function HeroShaderBackground({ code }: { code: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasKit, setCanvasKit] = useState<CanvasKit | null>(null);
  const [canvasVersion, setCanvasVersion] = useState(0);

  useEffect(() => {
    const globalWin = window as unknown as { CanvasKitLoaded?: CanvasKit };
    if (globalWin.CanvasKitLoaded) {
      setTimeout(() => setCanvasKit(globalWin.CanvasKitLoaded ?? null), 0);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/canvaskit-wasm@latest/bin/canvaskit.js';
    script.onload = () => {
      (window as unknown as {
        CanvasKitInit?: (opts: { locateFile: (file: string) => string }) => Promise<CanvasKit>;
        CanvasKitLoaded?: CanvasKit;
      }).CanvasKitInit?.({
        locateFile: (file: string) => 'https://unpkg.com/canvaskit-wasm@latest/bin/' + file
      }).then((ck: CanvasKit) => {
        (window as unknown as { CanvasKitLoaded?: CanvasKit }).CanvasKitLoaded = ck;
        setCanvasKit(ck);
      });
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const handleResize = () => setCanvasVersion((v) => v + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!canvasKit || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return false;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      return true;
    };

    if (!resizeCanvas()) return;

    const surface = canvasKit.MakeCanvasSurface(canvas);
    if (!surface) return;

    let effect: RuntimeEffect | null = null;
    let shader: Shader | null = null;
    let animationId: number | null = null;
    let isActive = true;
    const startTime = Date.now();

    try {
      effect = canvasKit.RuntimeEffect.Make(code);
      if (!effect) return;

      const draw = () => {
        if (!isActive || !effect) return;

        try {
          const skcanvas = surface.getCanvas();
          const paint = new canvasKit.Paint();
          const currentTime = (Date.now() - startTime) / 1000;
          const uniforms = new Float32Array([
            currentTime,
            canvas.width,
            canvas.height
          ]);

          if (shader) {
            shader.delete();
            shader = null;
          }

          shader = effect.makeShader(uniforms);
          paint.setShader(shader);

          skcanvas.clear(canvasKit.TRANSPARENT);
          skcanvas.drawPaint(paint);
          surface.flush();

          paint.delete();

          if (isActive) {
            animationId = requestAnimationFrame(draw);
          }
        } catch {
          isActive = false;
        }
      };

      draw();
    } catch {
      console.error('Hero shader error');
    }

    return () => {
      isActive = false;
      if (animationId !== null) cancelAnimationFrame(animationId);
      if (shader) shader.delete();
      if (effect) effect.delete();
      surface.delete();
    };
  }, [canvasKit, code, canvasVersion]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <HeroShaderBackground code={heroShaderCode} />

        {/* subtle color wash (keeps hue) */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/8 via-pink-600/6 to-blue-600/8 pointer-events-none" />

        {/* darker veil for contrast — tune the opacity */}
        <div className="absolute inset-0 bg-black/45 backdrop-blur-sm pointer-events-none" />

        {/* content above everything */}
        <div className="relative z-20 max-w-7xl mx-auto px-6 py-24 sm:py-32">
          <div className="text-center space-y-8">
            <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight">
              <span
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text text-transparent
                           drop-shadow-[0_12px_30px_rgba(0,0,0,0.55)]"
                style={{ WebkitTextStroke: '0.8px rgba(0,0,0,0.25)' }}
              >
                Skia Labs
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-xl text-zinc-200/95">
              Write, test, and explore SKSL shaders in real-time.
              A powerful web-based playground for creative coding with Skia&apos;s shader language.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link
                href="/editor"
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200 z-30"
              >
                Launch Editor
              </Link>
              <a
                href="#gallery"
                className="px-8 py-4 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-100 font-semibold rounded-full hover:bg-zinc-800/30 transition-all duration-200 z-30"
              >
                View Examples
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
              Real-time Preview
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              See your shaders come to life instantly as you type. Hot reload ensures smooth iteration.
            </p>
          </div>

          <div className="p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm">
            <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
              SKSL Syntax Highlighting
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Full Monaco editor with custom SKSL language support and beautiful syntax themes.
            </p>
          </div>

          <div className="p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
              Powered by CanvasKit
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Built on Skia&apos;s WebAssembly runtime for authentic shader rendering in the browser.
            </p>
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div id="gallery" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Shader Gallery
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Explore these example shaders to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shaderExamples.map((example, idx) => (
            <Link
              key={idx}
              href={`/editor?shader=${encodeURIComponent(example.code)}`}
              className="group relative bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="aspect-4/3 bg-zinc-900">
                <ShaderPreview code={example.code} />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {example.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
                  Click to open in editor →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer
      <div className="border-t border-zinc-200 dark:border-zinc-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            Built with Next.js, Monaco Editor, and CanvasKit by <a href="https://github.com/ABHIGYAN-MOHANTA" target="_blank" rel="noopener noreferrer" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">Abhigyan Mohanta</a>
          </p>
          

        </div>
      </div> */}

      {/* Footer */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4">

          <p className="text-zinc-600 dark:text-zinc-400 text-center sm:text-left">
            Built with{' '}
            <a
              href="https://nextjs.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Next.js
            </a>
            ,{' '}
            <a
              href="https://microsoft.github.io/monaco-editor"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Monaco Editor
            </a>
            , and{' '}
            <a
              href="https://skia.org/docs/user/modules/canvaskit"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              CanvasKit
            </a>
          </p>

          {/* GitHub Icon */}
          <a
            href="https://github.com/ABHIGYAN-MOHANTA/skia-labs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2"
          >
            <svg
              className="w-6 h-6 hover:scale-110 transition-transform"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.09 3.29 9.41 7.86 10.94.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.55-3.88-1.55-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.67 1.25 3.32.96.1-.74.4-1.25.73-1.54-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11.07 11.07 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.77.12 3.06.74.81 1.18 1.83 1.18 3.09 0 4.43-2.7 5.4-5.28 5.69.41.36.77 1.08.77 2.18 0 1.58-.01 2.86-.01 3.25 0 .31.21.68.8.56C20.71 21.43 24 17.11 24 12.02 24 5.66 18.85.5 12 .5z" />
            </svg>
          </a>

        </div>
      </div>

    </div>
  );
}
