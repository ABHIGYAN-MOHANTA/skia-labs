'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import posthog from 'posthog-js';
import type { CanvasKit, RuntimeEffect, Shader } from 'canvaskit-wasm';
import { shaderExamples } from '../shaderExamples'; 
import { loadCanvasKit } from '@/lib/canvaskit';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { Navbar } from '@/components/Navbar';

function ShaderPreview({ code }: { code: string }) {
  const [containerRef, isIntersecting] = useIntersectionObserver<HTMLDivElement>();
  const [centerRef, isCentered] = useIntersectionObserver<HTMLDivElement>({ rootMargin: '-35% 0px -35% 0px' });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasKit, setCanvasKit] = useState<CanvasKit | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768 && window.matchMedia("(hover: none)").matches);
  }, []);

  const isPlaying = isHovered || (isMobile && isCentered);

  useEffect(() => {
    if (isIntersecting && !canvasKit) {
      loadCanvasKit().then(setCanvasKit).catch(console.error);
    }
  }, [isIntersecting, canvasKit]);

  useEffect(() => {
    if (thumbnail || isPlaying || !canvasKit || !isIntersecting) return;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 400;
    tempCanvas.height = 225;

    let surface = canvasKit.MakeCanvasSurface(tempCanvas);
    
    if (!surface) return;

    let effect: RuntimeEffect | null = null;
    let shader: Shader | null = null;
    let paint: any = null;

    try {
      effect = canvasKit.RuntimeEffect.Make(code);
      if (effect) {
        const skcanvas = surface.getCanvas();
        paint = new canvasKit.Paint();
        const uniforms = new Float32Array([1.5, tempCanvas.width, tempCanvas.height]);
        shader = effect.makeShader(uniforms);
        paint.setShader(shader);
        
        skcanvas.clear(canvasKit.WHITE);
        skcanvas.drawPaint(paint);
        surface.flush();

        setThumbnail(tempCanvas.toDataURL('image/jpeg', 0.85));
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (paint) paint.delete();
      if (shader) shader.delete();
      if (effect) effect.delete();
      if (surface) surface.delete();

      const gl = tempCanvas.getContext('webgl2') || tempCanvas.getContext('webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
    }
  }, [canvasKit, code, isIntersecting, thumbnail, isPlaying]);

  useEffect(() => {
    if (!isPlaying || !canvasKit || !canvasRef.current) return;

    const canvas = canvasRef.current;
    let surface = canvasKit.MakeCanvasSurface(canvas);
    if (!surface) return;

    let effect: RuntimeEffect | null = null;
    let shader: Shader | null = null;
    let paint: any = null;
    let animationId: number;
    let isActive = true;
    const startTime = Date.now();

    try {
      effect = canvasKit.RuntimeEffect.Make(code);
      if (!effect) return;

      paint = new canvasKit.Paint();

      const draw = () => {
        if (!isActive || !effect || !surface) return;
        try {
          const skcanvas = surface.getCanvas();
          const currentTime = (Date.now() - startTime) / 1000;
          const uniforms = new Float32Array([currentTime, canvas.width, canvas.height]);
          
          if (shader) shader.delete();
          shader = effect.makeShader(uniforms);
          paint.setShader(shader);

          skcanvas.clear(canvasKit.WHITE);
          skcanvas.drawPaint(paint);
          surface.flush();

          if (isActive) animationId = requestAnimationFrame(draw);
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
      if (animationId) cancelAnimationFrame(animationId);
      if (surface) surface.delete();

      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
    };
  }, [canvasKit, code, isPlaying]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div ref={centerRef} className="absolute inset-0 pointer-events-none" />
      {thumbnail && (
        <img src={thumbnail} className={`absolute inset-0 w-full h-full object-cover z-10 ${isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} alt="Shader preview" />
      )}
      {isPlaying && (
        <canvas
          ref={canvasRef}
          width={400}
          height={225}
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
      )}
    </div>
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
              <div className="aspect-video bg-black/50">
                <ShaderPreview code={example.code} />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {example.title}
                  </h3>
                  {example.tag && (
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      example.tag === 'Simple' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                      example.tag === 'Intermediate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                      'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                    }`}>
                      {example.tag}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-500">
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
