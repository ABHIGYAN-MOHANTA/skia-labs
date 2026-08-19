'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { initKeyboard, keyboardTexture } from '@/lib/keyboard';
import posthog from 'posthog-js';
import type { CanvasKit, RuntimeEffect, Shader } from 'canvaskit-wasm';
import { shaderExamples } from './shaderExamples';
import { loadCanvasKit } from '@/lib/canvaskit';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

const heroShaderCode = shaderExamples.find(s => s.title === 'Starfield')?.code || '';



function HeroShaderBackground({ code }: { code: string }) {
  const [canvasRef, isIntersecting] = useIntersectionObserver<HTMLCanvasElement>();
  const [canvasKit, setCanvasKit] = useState<CanvasKit | null>(null);
  const [canvasVersion, setCanvasVersion] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => setIsVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    initKeyboard();
    if (isIntersecting && !canvasKit) {
      loadCanvasKit().then(setCanvasKit).catch(console.error);
    }
  }, [isIntersecting, canvasKit]);

  useEffect(() => {
    const handleResize = () => setCanvasVersion((v) => v + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!canvasKit || !canvasRef.current || !isIntersecting || !isVisible) return;

    const canvas = canvasRef.current;
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return false;
      const rect = parent.getBoundingClientRect();
      // Cap DPR at 1.5 to save massive amounts of GPU processing on high-DPI devices (like mobile phones)
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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

      let lastDrawTime = 0;
      let frameCount = 0;
      const frameInterval = 1000 / 30; // 30 FPS cap

      const draw = (time: number) => {
        if (!isActive || !effect) return;

        if (isActive) {
          animationId = requestAnimationFrame(draw);
        }

        if (time - lastDrawTime < frameInterval) return;
        lastDrawTime = time;

        try {
          const skcanvas = surface.getCanvas();
          const paint = new canvasKit.Paint();
          const now = Date.now();
          const currentTime = (now - startTime) / 1000;
          const timeDelta = lastDrawTime === 0 ? 0 : (now - lastDrawTime) / 1000;
          const frameRate = timeDelta > 0 ? 1.0 / timeDelta : 0.0;
          
          const numUniforms = effect.getUniformCount();
          const uniformData = new Float32Array(effect.getUniformFloatCount());

          for (let i = 0; i < numUniforms; i++) {
              const name = effect.getUniformName(i);
              const uniform = effect.getUniform(i);
              const slot = uniform.slot;
              
              if (name === 'iTime') {
                  uniformData[slot] = currentTime;
              } else if (name === 'iResolution') {
                  uniformData[slot] = canvas.width;
                  uniformData[slot + 1] = canvas.height;
              } else if (name === 'iTimeDelta') {
                  uniformData[slot] = timeDelta;
              } else if (name === 'iFrame') {
                  uniformData[slot] = frameCount; 
              } else if (name === 'iFrameRate') {
                  uniformData[slot] = frameRate;
              } else if (name === 'iDate') {
                  const d = new Date();
                  uniformData[slot] = d.getFullYear();
                  uniformData[slot + 1] = d.getMonth() + 1;
                  uniformData[slot + 2] = d.getDate();
                  uniformData[slot + 3] = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
              }
          }

          if (shader) {
            shader.delete();
            shader = null;
          }

          const hasKeyboard = /uniform\s+shader\s+iKeyboard;/.test(code);
          if (hasKeyboard) {
              const kbImg = canvasKit.MakeImage({
                  width: 256,
                  height: 3,
                  alphaType: canvasKit.AlphaType.Opaque,
                  colorType: canvasKit.ColorType.RGBA_8888,
                  colorSpace: canvasKit.ColorSpace.SRGB
              }, keyboardTexture, 256 * 4);
              
              if (kbImg) {
                  const kbShader = kbImg.makeShaderOptions(
                      canvasKit.TileMode.Clamp,
                      canvasKit.TileMode.Clamp,
                      canvasKit.FilterMode.Nearest,
                      canvasKit.MipmapMode.None,
                      undefined
                  );
                  shader = effect.makeShaderWithChildren(uniformData, [kbShader]);
                  kbShader.delete();
                  kbImg.delete();
              } else {
                  shader = effect.makeShader(uniformData);
              }
          } else {
              shader = effect.makeShader(uniformData);
          }
          paint.setShader(shader);

          skcanvas.clear(canvasKit.TRANSPARENT);
          skcanvas.drawPaint(paint);
          surface.flush();
          
          frameCount++;

          paint.delete();
        } catch {
          isActive = false;
        }
      };

      animationId = requestAnimationFrame(draw);
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
  }, [canvasKit, code, canvasVersion, isIntersecting, isVisible]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText('npx skills add abhigyan-mohanta/sksl-writer');
    setCopied(true);
    posthog.capture('button_clicked', { button_name: 'Copy Agent Skill - Hero' });
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    loadCanvasKit()
      .then(() => setIsLoaded(true))
      .catch(console.error);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-600 dark:text-zinc-400 font-medium animate-pulse">Loading Skia Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative text-zinc-900 dark:text-zinc-100">
      {/* Fixed background for the entire page */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-black">
        <HeroShaderBackground code={heroShaderCode} />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <div className="relative overflow-hidden">

          {/* darker veil for contrast — removed per user request */}

          {/* content above everything */}
          <div className="relative z-20 max-w-7xl mx-auto px-6 pt-32 pb-24 sm:pt-40 sm:pb-32">
            <div className="text-center space-y-8 relative">
              {/* Soft dark glow to ensure text readability against busy shaders */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[120%] bg-black/50 blur-[60px] -z-10 pointer-events-none rounded-[100%]"></div>

              <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight">
                <span
                  className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text text-transparent
                           drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)]"
                  style={{ WebkitTextStroke: '0.8px rgba(0,0,0,0.25)' }}
                >
                  Skia Labs
                </span>
              </h1>

              <p className="max-w-2xl mx-auto text-xl font-medium text-zinc-100 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                App looking bland? Want animations, but tired of massive Lottie files tanking your performance? Stop choking your app with bloated JSONs. Skia-powered shaders run at 60fps, weigh nothing, and look incredible. Build, test, and tweak SKSL right here, then drop it directly into your React Native, Flutter, or even Native Mobile app.
              </p>

              <div className="grid grid-cols-1 sm:flex sm:flex-row gap-3 sm:gap-6 justify-center items-stretch sm:items-center pt-8 w-full max-w-[340px] sm:max-w-none mx-auto">
                <Link
                  href="/editor"
                  onClick={() => posthog.capture('button_clicked', { button_name: 'Launch Editor - Hero' })}
                  className="w-full sm:w-auto text-center px-8 py-3.5 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full shadow-[0_0_30px_-5px_rgba(236,72,153,0.5)] hover:shadow-[0_0_30px_-5px_rgba(236,72,153,0.8)] hover:scale-[1.02] transition-all duration-300 z-30"
                >
                  Launch Editor
                </Link>
                <Link
                  href="/community"
                  onClick={() => posthog.capture('button_clicked', { button_name: 'Community - Hero' })}
                  className="w-full sm:w-auto text-center px-8 py-3.5 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-full shadow-[0_0_30px_-5px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.8)] hover:scale-[1.02] transition-all duration-300 z-30"
                >
                  Community
                </Link>
                <Link
                  href="/examples"
                  onClick={() => posthog.capture('button_clicked', { button_name: 'View Examples - Hero' })}
                  className="w-full sm:w-auto text-center px-2 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold rounded-full shadow-[0_0_30px_-5px_rgba(99,102,241,0.5)] hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.8)] hover:scale-[1.02] transition-all duration-300 z-30 text-sm sm:text-base flex items-center justify-center"
                >
                  <span className="hidden sm:inline mr-1">View</span> Examples
                </Link>
              </div>

              <div className="flex justify-center mt-6">
                <div 
                  onClick={handleCopy}
                  className="inline-flex items-center gap-3 px-5 py-2.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full cursor-pointer hover:bg-black/60 hover:border-purple-500/50 transition-all duration-300 group z-30 shadow-lg"
                >
                  <div className="text-zinc-400 font-mono text-sm sm:text-base">
                    <span className="opacity-50 select-none mr-2">$</span>
                    <span className="text-zinc-100">npx skills add abhigyan-mohanta/sksl-writer</span>
                  </div>
                  <div className="p-1.5 bg-white/10 rounded-md group-hover:bg-white/20 transition-colors">
                    {copied ? (
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-white/10 dark:bg-zinc-900/40 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl shadow-lg">
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

            <div className="p-8 bg-white/10 dark:bg-zinc-900/40 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl shadow-lg">
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

            <div className="p-8 bg-white/10 dark:bg-zinc-900/40 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl shadow-lg">
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



        {/* Footer
      <div className="border-t border-zinc-200 dark:border-zinc-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            Built with Next.js, Monaco Editor, and CanvasKit by <a href="https://github.com/ABHIGYAN-MOHANTA" target="_blank" rel="noopener noreferrer" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">Abhigyan Mohanta</a>
          </p>
          

        </div>
      </div> */}

        {/* Footer */}
        <div className="border-t border-white/10 bg-black/40 backdrop-blur-md mt-20">
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
              onClick={() => posthog.capture('button_clicked', { button_name: 'GitHub Icon - Footer' })}
              className="text-zinc-400 hover:text-zinc-200 transition-all duration-75 flex items-center gap-2 hover:scale-105"
            >
              <svg
                className="w-6 h-6"
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
    </div>
  );
}
