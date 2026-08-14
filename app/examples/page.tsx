'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import posthog from 'posthog-js';
import type { CanvasKit, RuntimeEffect, Shader } from 'canvaskit-wasm';
import { shaderExamples } from '../shaderExamples'; 
import { loadCanvasKit } from '@/lib/canvaskit';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { Navbar } from '@/components/Navbar';

function ShaderPreview({ code }: { code: string }) {
  const [canvasRef, isIntersecting] = useIntersectionObserver<HTMLCanvasElement>();
  const [canvasKit, setCanvasKit] = useState<CanvasKit | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => setIsVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (isIntersecting) {
      loadCanvasKit().then(setCanvasKit).catch(console.error);
    }
  }, [isIntersecting]);

  useEffect(() => {
    if (!canvasKit || !canvasRef.current || !isIntersecting || !isVisible) return;

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
  }, [canvasKit, code, isIntersecting, isVisible]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={300}
      className="w-full h-full object-cover"
    />
  );
}

export default function ExamplesPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-8 pt-24 sm:p-12 sm:pt-28">
      <Navbar />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-0 mb-12">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">Shader Gallery</h2>
              <p className="text-zinc-500 dark:text-zinc-400">
                Explore these example shaders to get started, or <a href="/sksl-shader-writer.zip" download className="text-purple-500 hover:text-purple-400 underline transition-colors" onClick={() => posthog.capture('button_clicked', { button_name: 'Download Agent Skill - Examples' })}>download the Agent Skill</a> to have AI write them for you!
              </p>
            </div>
          </div>
          <Link href="/" onClick={() => posthog.capture('button_clicked', { button_name: 'Back to Home - Examples' })} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Home
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shaderExamples.map((example, idx) => (
            <Link
              key={idx}
              href={`/editor?preset=${idx}`}
              onClick={() => posthog.capture('button_clicked', { button_name: 'Shader Gallery Item', example_title: example.title })}
              className="group relative bg-white/10 dark:bg-zinc-900/40 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="aspect-4/3 bg-black/50">
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
    </div>
  );
}
