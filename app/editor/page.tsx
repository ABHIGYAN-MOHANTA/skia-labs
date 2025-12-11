'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import { useSearchParams } from 'next/navigation';

const registerSkslLanguage = (monaco: Monaco) => {
    const languageId = 'sksl';

    monaco.languages.register({ id: languageId });

    monaco.languages.setLanguageConfiguration(languageId, {
        comments: { lineComment: '//', blockComment: ['/*', '*/'] },
        brackets: [['{', '}'], ['[', ']'], ['(', ')']],
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
            { open: '/*', close: '*/' },
        ],
        surroundingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
        ],
    });

    monaco.languages.setMonarchTokensProvider(languageId, {
        tokenizer: {
            root: [
                [/[a-zA-Z_]\w*/, {
                    cases: {
                        '@keywords': 'keyword',
                        '@types': 'type',
                        '@builtins': 'predefined',
                        '@default': 'identifier',
                    }
                }],
                [/\d*\.\d+([eE][-+]?\d+)?[fF]?/, 'number.float'],
                [/\d+[uU]?[lL]?/, 'number'],
                [/".*?"/, 'string'],
                [/'.'/, 'string'],
                [/\/\/.*$/, 'comment'],
                [/\/\*/, 'comment', '@comment'],
                [/[{}()\[\]]/, '@brackets'],
                [/[;,.]/, 'delimiter'],
                [/[+\-*\/%=&|^!<>]=?/, 'operator'],
            ],
            comment: [
                [/[^/*]+/, 'comment'],
                [/\*\//, 'comment', '@pop'],
                [/./, 'comment']
            ],
        },
        keywords: [
            'if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue', 'switch', 'case', 'default',
            'struct', 'const', 'uniform', 'in', 'out', 'inout', 'varying', 'layout', 'discard'
        ],
        types: [
            'void', 'bool', 'int', 'uint', 'float', 'half', 'double',
            'vec2', 'vec3', 'vec4', 'ivec2', 'ivec3', 'ivec4', 'uvec2', 'uvec3', 'uvec4',
            'mat2', 'mat3', 'mat4', 'half2', 'half3', 'half4', 'float2', 'float3', 'float4'
        ],
        builtins: [
            'sin', 'cos', 'tan', 'abs', 'pow', 'exp', 'log', 'sqrt', 'inversesqrt',
            'min', 'max', 'clamp', 'mix', 'step', 'smoothstep', 'dot', 'cross', 'normalize',
            'texture', 'sampler2D', 'main'
        ]
    });

    monaco.editor.defineTheme('sksl-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: 'C792EA' },
            { token: 'type', foreground: '82AAFF' },
            { token: 'predefined', foreground: '89DDFF' },
            { token: 'number', foreground: 'F78C6C' },
            { token: 'string', foreground: 'C3E88D' },
            { token: 'comment', foreground: '637777' },
        ],
        colors: {}
    });
};

const defaultShaderCode = `// kind=shader
uniform float iTime;
uniform float2 iResolution;

half4 main(float2 fragCoord) {
    // Normalized pixel coordinates (from 0 to 1)
    float2 uv = fragCoord / iResolution.xy;

    // Time varying pixel color
    float3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + float3(0, 2, 4));

    // Output to screen
    return half4(col, 1.0);
}`;

function ShaderRenderer({ code }: { code: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string>('');
    const [canvasKit, setCanvasKit] = useState<import('canvaskit-wasm').CanvasKit | null>(null);
    const [debouncedCode, setDebouncedCode] = useState(code);

    useEffect(() => {
        // Load CanvasKit
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/canvaskit-wasm@latest/bin/canvaskit.js';
        script.onload = () => {
            (window as unknown as { CanvasKitInit?: (opts: unknown) => Promise<import('canvaskit-wasm').CanvasKit> }).CanvasKitInit!({
                locateFile: (file: string) => 'https://unpkg.com/canvaskit-wasm@latest/bin/' + file
            }).then((ck: import('canvaskit-wasm').CanvasKit) => {
                setCanvasKit(ck);
            });
        };
        document.head.appendChild(script);
        return () => {
            document.head.removeChild(script);
        };
    }, []);

    // Debounce code changes to prevent crashes during typing
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedCode(code);
        }, 300);
        return () => clearTimeout(timer);
    }, [code]);

    useEffect(() => {
        if (!canvasKit || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const setErrorAsync = (message: string) => setTimeout(() => setError(message), 0);
        const surface = canvasKit.MakeCanvasSurface(canvas);
        if (!surface) {
            setErrorAsync('Failed to create surface');
            return;
        }

        let effect: import('canvaskit-wasm').RuntimeEffect | null = null;
        let shader: import('canvaskit-wasm').Shader | null = null;
        let animationId: number | null = null;
        let isActive = true;
        const startTime = Date.now();

        try {
            effect = canvasKit.RuntimeEffect.Make(debouncedCode);
            if (!effect) {
                setErrorAsync('Failed to compile shader - invalid SKSL syntax');
                return;
            }
            setErrorAsync('');

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

                    // Clean up previous shader before creating new one
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
                } catch (e) {
                    console.error('Render error:', e);
                    isActive = false;
                }
            };

            draw();
        } catch (e: unknown) {
            if (e && typeof e === 'object' && 'message' in e) {
                setErrorAsync((e as Error).message);
            } else {
                setErrorAsync('Shader compilation error');
            }
        }

        return () => {
            isActive = false;
            if (animationId !== null) {
                cancelAnimationFrame(animationId);
            }
            if (shader) {
                shader.delete();
            }
            if (effect) {
                effect.delete();
            }
            surface.delete();
        };
    }, [canvasKit, debouncedCode]);

    return (
        <div className="relative h-full w-full flex items-center justify-center bg-zinc-900">
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="max-w-full max-h-full"
            />
            {error && (
                <div className="absolute top-4 left-4 right-4 bg-red-500 text-white p-4 rounded-lg font-mono text-sm">
                    {error}
                </div>
            )}
            {!canvasKit && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-white">
                    Loading CanvasKit...
                </div>
            )}
        </div>
    );
}

export default function EditorPage() {
    const searchParams = useSearchParams();
    const defaultEditorPercent = 0.5; // 50% as user default
    const initialEditorWidth = 480; // exact SSR and initial render width
    const containerRef = useRef<HTMLDivElement>(null);
    const [code, setCode] = useState(() => searchParams.get('shader') ?? defaultShaderCode);
    const [editorWidth, setEditorWidth] = useState<number>(initialEditorWidth);
    const [dragging, setDragging] = useState(false);
    const [baseUrl, setBaseUrl] = useState('');

    // Capture the current origin on the client for share links.
    useEffect(() => {
        setTimeout(() => setBaseUrl(window.location.origin), 0);
    }, []);

    const shareLink = useMemo(() => {
        if (!baseUrl) return '';
        return `${baseUrl}/editor?shader=${encodeURIComponent(code)}`;
    }, [baseUrl, code]);

    const copyShareLink = async () => {
        if (!shareLink) return;
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareLink);
            } else {
                // Fallback for environments without Clipboard API (e.g., http, older browsers)
                const textarea = document.createElement('textarea');
                textarea.value = shareLink;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
        } catch (err) {
            console.error('Failed to copy link', err);
        }
    };

    const copyCode = async () => {
        if (!code) return;
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(code);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = code;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
        } catch (err) {
            console.error('Failed to copy code', err);
        }
    };


    // After mount, update to preferred/stored/percentage width
    useEffect(() => {
        setTimeout(() => {
            const stored = window.localStorage.getItem('editorWidth');
            if (stored) {
                setEditorWidth(parseInt(stored, 10));
            } else {
                const viewportW = window.innerWidth || 1920;
                const px = Math.max(240, Math.min(viewportW * defaultEditorPercent, viewportW - 240));
                setEditorWidth(px);
            }
        }, 0);
    }, []);

    // Prevent text selection while dragging
    useEffect(() => {
        if (dragging) {
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
        } else {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }
        return () => {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, [dragging]);

    useEffect(() => {
        if (!dragging) return;
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            let newWidth = e.clientX - rect.left;
            newWidth = Math.max(240, Math.min(newWidth, window.innerWidth - 240));
            setEditorWidth(newWidth);
        };
        const handleMouseUp = () => {
            setDragging(false);
            window.localStorage.setItem('editorWidth', String(editorWidth));
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        // Touch events
        const handleTouchMove = (e: TouchEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            let newWidth = e.touches[0].clientX - rect.left;
            newWidth = Math.max(240, Math.min(newWidth, window.innerWidth - 240));
            setEditorWidth(newWidth);
        };
        const handleTouchEnd = () => {
            setDragging(false);
            window.localStorage.setItem('editorWidth', String(editorWidth));
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleTouchEnd);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [dragging, editorWidth]);

    const startDragging = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setDragging(true);
    };

    return (
        <div ref={containerRef} className="flex min-h-screen w-full bg-zinc-100 select-none relative">
            {/* Editor Pane */}
            <div
                style={{ width: editorWidth, minWidth: 240, maxWidth: '80vw' }}
                className="h-full border-r border-zinc-300 bg-white shrink-0 overflow-hidden"
            >
                <Editor
                    height="100vh"
                    defaultLanguage="sksl"
                    value={code}
                    onChange={(value) => value && setCode(value)}
                    beforeMount={registerSkslLanguage}
                    theme="sksl-dark"
                    options={{ minimap: { enabled: false } }}
                />
            </div>
            {/* Drag handle */}
            <div
                className={`absolute left-0 top-0 z-30 h-full ${dragging ? '' : 'hover:bg-zinc-200'} flex items-center justify-center`}
                style={{ left: editorWidth - 4, width: 12, cursor: 'col-resize', background: dragging ? '#ddd' : 'transparent', transition: 'background 0.1s' }}
                onMouseDown={startDragging}
                onTouchStart={startDragging}
            >
                <div className="w-2 h-8 bg-zinc-400 rounded-full opacity-80 pointer-events-none" />
            </div>
            {/* Preview Pane */}
            <div className={`flex-1 bg-zinc-50 h-full min-w-[240px]${dragging ? ' pointer-events-none' : ''}`}>
                <div className="flex flex-col h-full">
                    <div className="flex-1">
                        <ShaderRenderer code={code} />
                    </div>
                    <div className="border-t border-zinc-200 bg-white px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-zinc-700">Share this shader</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                        <button
                                onClick={copyCode}
                                disabled={!code}
                                className="text-sm px-3 py-1.5 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
                            >
                                Copy code
                            </button>
                            <button
                                onClick={copyShareLink}
                                disabled={!shareLink}
                                className="text-sm px-3 py-1.5 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
                            >
                                Copy link
                            </button>
                            
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}