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
    return half4(col, 1.0);
}`;

const shaderExamples = [
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
    return half4(col, 1.0);
}`
  },
  {
    title: 'Color Waves',
    code: `// kind=shader
// Skia Labs provides iTime (seconds) and iResolution (width,height); keep these uniform.
uniform float iTime;
uniform float2 iResolution;
half4 main(float2 fragCoord) {
    float2 uv = fragCoord / iResolution.xy;
    float3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + float3(0, 2, 4));
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
    return half4(col, 1.0);
}`
  }
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
    <div className="min-h-screen bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <HeroShaderBackground code={heroShaderCode} />
        <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 mix-blend-screen opacity-70" />
        <div className="absolute inset-0 bg-linear-to-b from-zinc-900/10 via-transparent to-zinc-900/30" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-24 sm:py-32">
          <div className="text-center space-y-8">
            <h1 className="text-6xl sm:text-7xl font-bold tracking-tight">
              <span className="bg-linear-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                Skia Labs
              </span>
            </h1>
            
              <p className="max-w-2xl mx-auto text-xl text-zinc-600 dark:text-zinc-400">
                Write, test, and explore SKSL shaders in real-time. 
                A powerful web-based playground for creative coding with Skia&#39;s shader language.
              </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link
                href="/editor"
                className="px-8 py-4 bg-linear-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                Launch Editor
              </Link>
              <a
                href="#gallery"
                className="px-8 py-4 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all duration-200"
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
                  Built on Skia&#39;s WebAssembly runtime for authentic shader rendering in the browser.
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

      {/* Footer */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            Built with Next.js, Monaco Editor, and CanvasKit
          </p>
        </div>
      </div>
    </div>
  );
}