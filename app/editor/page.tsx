'use client';
import { useEffect, useRef, useState } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';

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

function ShaderRenderer({ code }: { code: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string>('');
    const [canvasKit, setCanvasKit] = useState<any>(null);

    useEffect(() => {
        // Load CanvasKit
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/canvaskit-wasm@latest/bin/canvaskit.js';
        script.onload = () => {
            (window as any).CanvasKitInit({
                locateFile: (file: string) => 'https://unpkg.com/canvaskit-wasm@latest/bin/' + file
            }).then((ck: any) => {
                setCanvasKit(ck);
            });
        };
        document.head.appendChild(script);

        return () => {
            document.head.removeChild(script);
        };
    }, []);

    useEffect(() => {
        if (!canvasKit || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const surface = canvasKit.MakeCanvasSurface(canvas);
        if (!surface) {
            setError('Failed to create surface');
            return;
        }

        let shader: any = null;
        let animationId: number;
        const startTime = Date.now();

        try {
            const effect = canvasKit.RuntimeEffect.Make(code);
            if (!effect) {
                setError('Failed to compile shader - invalid SKSL syntax');
                return;
            }
            setError('');

            const draw = () => {
                const skcanvas = surface.getCanvas();
                const paint = new canvasKit.Paint();

                const currentTime = (Date.now() - startTime) / 1000;
                const uniforms = new Float32Array([
                    currentTime,
                    canvas.width,
                    canvas.height
                ]);

                shader = effect.makeShader(uniforms, false);
                paint.setShader(shader);

                skcanvas.clear(canvasKit.WHITE);
                skcanvas.drawPaint(paint);
                surface.flush();

                paint.delete();
                if (shader) shader.delete();

                animationId = requestAnimationFrame(draw);
            };

            draw();
        } catch (e: any) {
            setError(e.message || 'Shader compilation error');
        }

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
            if (shader) shader.delete();
            surface.delete();
        };
    }, [canvasKit, code]);

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
    const [code, setCode] = useState(`// kind=shader
uniform float iTime;
uniform float2 iResolution;

half4 main(float2 fragCoord) {
    // Normalized pixel coordinates (from 0 to 1)
    float2 uv = fragCoord / iResolution.xy;

    // Time varying pixel color
    float3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + float3(0, 2, 4));

    // Output to screen
    return half4(col, 1.0);
}`);

    return (
        <div className="grid min-h-screen grid-cols-2 bg-zinc-100">
            <div className="border-r border-zinc-300 bg-white">
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
            <div className="bg-zinc-50">
                <ShaderRenderer code={code} />
            </div>
        </div>
    );
}