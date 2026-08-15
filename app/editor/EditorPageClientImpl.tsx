'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import Link from 'next/link';
import { loadCanvasKit } from '@/lib/canvaskit';
import { useSearchParams } from 'next/navigation';
import { shaderExamples } from '../shaderExamples';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import posthog from 'posthog-js';
import { SignInModal } from '@/components/SignInModal';

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
// Skia Labs provides iTime (seconds) and iResolution (width,height); keep these uniform.
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

function ShaderRenderer({ code, canvasRef }: { code: string, canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
    const [error, setError] = useState<string>('');
    const [canvasKit, setCanvasKit] = useState<import('canvaskit-wasm').CanvasKit | null>(null);
    const [debouncedCode, setDebouncedCode] = useState(code);
    const mouseState = useRef({ x: 0, y: 0, z: 0, w: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const handlePointerMove = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseState.current.x = e.clientX - rect.left;
            mouseState.current.y = e.clientY - rect.top;
            if (mouseState.current.z > 0) {
                mouseState.current.z = mouseState.current.x;
                mouseState.current.w = mouseState.current.y;
            }
        };
        const handlePointerDown = (e: PointerEvent) => {
            canvas.setPointerCapture(e.pointerId);
            const rect = canvas.getBoundingClientRect();
            mouseState.current.z = e.clientX - rect.left;
            mouseState.current.w = e.clientY - rect.top;
            mouseState.current.x = mouseState.current.z;
            mouseState.current.y = mouseState.current.w;
        };
        const handlePointerUp = (e: PointerEvent) => {
            canvas.releasePointerCapture(e.pointerId);
            mouseState.current.z = 0;
            mouseState.current.w = 0;
        };

        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointercancel', handlePointerUp);
        return () => {
            canvas.removeEventListener('pointermove', handlePointerMove);
            canvas.removeEventListener('pointerdown', handlePointerDown);
            canvas.removeEventListener('pointerup', handlePointerUp);
            canvas.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [canvasRef]);

    useEffect(() => {
        loadCanvasKit()
            .then(setCanvasKit)
            .catch(console.error);
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
        const surface = canvasKit.MakeWebGLCanvasSurface(canvas, canvasKit.ColorSpace.SRGB, { preserveDrawingBuffer: 1 });
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
            let compileError = '';
            effect = canvasKit.RuntimeEffect.Make(debouncedCode, (err) => {
                compileError = err;
            });
            if (!effect) {
                setErrorAsync(compileError || 'Failed to compile shader - invalid SKSL syntax');
                return;
            }
            setErrorAsync('');

            const draw = () => {
                if (!isActive || !effect) return;

                try {
                    const skcanvas = surface.getCanvas();
                    const paint = new canvasKit.Paint();
                    const currentTime = (Date.now() - startTime) / 1000;
                    
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
                        } else if (name === 'iMouse') {
                            uniformData[slot] = mouseState.current.x;
                            uniformData[slot + 1] = mouseState.current.y;
                            uniformData[slot + 2] = mouseState.current.z;
                            uniformData[slot + 3] = mouseState.current.w;
                        }
                    }

                    // Clean up previous shader before creating new one
                    if (shader) {
                        shader.delete();
                        shader = null;
                    }

                    shader = effect.makeShader(uniformData);
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
                className="max-w-full max-h-full touch-none"
            />
            {error && (
                <div className="absolute top-20 left-4 right-4 bg-red-500 text-white p-4 rounded-lg font-mono text-sm z-50 shadow-lg whitespace-pre-wrap max-h-96 overflow-y-auto">
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
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [code, setCode] = useState(() => defaultShaderCode);
    const [editorWidth, setEditorWidth] = useState<number>(initialEditorWidth);
    const [dragging, setDragging] = useState(false);
    const [showMobileOverlay, setShowMobileOverlay] = useState(false);

    // Mobile Overlay Detection
    useEffect(() => {
        const checkMobile = () => {
            if (window.innerWidth < 768 && !window.localStorage.getItem('skia_mobile_overlay_dismissed')) {
                setShowMobileOverlay(true);
            }
        };
        // Small delay to ensure hydration matches
        setTimeout(checkMobile, 100);
    }, []);

    const dismissMobileOverlay = () => {
        posthog.capture('button_clicked', { button_name: 'Dismiss Mobile Overlay' });
        window.localStorage.setItem('skia_mobile_overlay_dismissed', 'true');
        setShowMobileOverlay(false);
    };
    const [baseUrl, setBaseUrl] = useState('');
    const [sharing, setSharing] = useState(false);
    const [shareId, setShareId] = useState<string | null>(null);
    const [hasUserEdited, setHasUserEdited] = useState(false);
    const [isFetchingShader, setIsFetchingShader] = useState(() => !!searchParams?.get('id'));
    const [showSignInModal, setShowSignInModal] = useState(false);

    useEffect(() => {
        // Suppress annoying harmless "Canceled" errors from Monaco Editor
        const originalConsoleError = console.error;
        console.error = (...args: any[]) => {
            const arg = args[0];
            if (typeof arg === 'string' && arg.includes('Canceled')) return;
            if (arg && typeof arg === 'object') {
                if (arg.name === 'Canceled' || arg.message === 'Canceled' || (typeof arg.message === 'string' && arg.message.includes('Canceled'))) {
                    return;
                }
            }
            originalConsoleError.apply(console, args);
        };

        return () => {
            console.error = originalConsoleError;
        };
    }, []);
    const autosaveTimerRef = useRef<number | null>(null);

    const { user } = useAuth();
    const [authorUid, setAuthorUid] = useState<string | null>(null);

    const [showCommunityModal, setShowCommunityModal] = useState(false);
    const [communityTitle, setCommunityTitle] = useState('');
    const [sharingToCommunity, setSharingToCommunity] = useState(false);
    const [communityShareSuccess, setCommunityShareSuccess] = useState(false);
    const [communityShareError, setCommunityShareError] = useState('');

    // Capture the current origin on the client for share links.
    useEffect(() => {
        setTimeout(() => setBaseUrl(window.location.origin), 0);
    }, []);

    const shareLink = useMemo(() => {
        return baseUrl ? `${baseUrl}/editor` : '';
    }, [baseUrl]);

    const ensureShareId = useCallback(() => {
        if (!user) {
            // Cannot save without logging in, but we can generate a local ID
            const newId = crypto.randomUUID();
            setShareId(newId);
            return newId;
        }

        // If the current shader has an authorUid that doesn't match the current user,
        // it means we are trying to edit someone else's shader. We should create a new ID (fork).
        if (authorUid && authorUid !== user.uid) {
            const newId = crypto.randomUUID();
            setShareId(newId);
            setAuthorUid(user.uid);
            try {
                window.localStorage.setItem('shaderShareId', newId);
            } catch {
                // ignore
            }
            if (typeof window !== 'undefined') {
                window.history.replaceState(null, '', `/editor?id=${newId}`);
            }
            return newId;
        }

        // Otherwise generate a new ID if we don't have one
        const newId = crypto.randomUUID();
        setShareId(newId);
        setAuthorUid(user.uid);
        try {
            window.localStorage.setItem('shaderShareId', newId);
        } catch {
            // ignore
        }
        return newId;
    }, [user, authorUid]);

    useEffect(() => {
        const id = searchParams.get('id');
        if (!id) return;

        let cancelled = false;
        const load = async () => {
            setIsFetchingShader(true);
            try {
                const docRef = doc(db, 'shaders', id);
                const docSnap = await getDoc(docRef);
                
                if (cancelled) return;
                
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCode(data.code);
                    setAuthorUid(data.authorUid || null);
                    setHasUserEdited(false);
                } else {
                    console.warn('Failed to load shared shader: Document does not exist');
                }
            } catch (error) {
                console.warn('Failed to load shared shader', error);
            } finally {
                if (!cancelled) {
                    setIsFetchingShader(false);
                }
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [searchParams]);

    useEffect(() => {
        const preset = searchParams.get('preset');
        if (!preset) return;
        if (searchParams.get('id')) return;

        const idx = Number.parseInt(preset, 10);
        if (!Number.isFinite(idx)) return;
        if (idx < 0 || idx >= shaderExamples.length) return;

        setCode(shaderExamples[idx].code);
        setHasUserEdited(false);
        setShareId(null);
        setAuthorUid(null);
        try {
            window.localStorage.removeItem('shaderShareId');
        } catch {
            // ignore
        }
    }, [searchParams]);

    useEffect(() => {
        const legacyShader = searchParams.get('shader');
        if (!legacyShader) return;
        if (searchParams.get('id')) return;
        if (searchParams.get('preset')) return;

        setCode(legacyShader);
        setHasUserEdited(false);
        setShareId(null);
        try {
            window.localStorage.removeItem('shaderShareId');
        } catch {
            // ignore
        }
        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', '/editor');
        }
    }, [searchParams]);

    useEffect(() => {
        if (!hasUserEdited || !user) return; // Only autosave if logged in

        const id = shareId ?? ensureShareId();

        if (autosaveTimerRef.current !== null) {
            window.clearTimeout(autosaveTimerRef.current);
        }

        autosaveTimerRef.current = window.setTimeout(async () => {
            try {
                const shaderRef = doc(db, 'shaders', id);
                const shaderSnap = await getDoc(shaderRef);
                
                if (shaderSnap.exists()) {
                    // Update only if owned
                    if (shaderSnap.data().authorUid === user.uid) {
                        await updateDoc(shaderRef, { code });
                    }
                } else {
                    // Create
                    await setDoc(shaderRef, {
                        code,
                        authorUid: user.uid,
                        timestamp: Date.now(),
                        likes: 0,
                    });
                }
            } catch (err) {
                console.error('Failed to autosave shader', err);
            }
        }, 800);

        return () => {
            if (autosaveTimerRef.current !== null) {
                window.clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }
        };
    }, [code, ensureShareId, hasUserEdited, shareId, user]);

    const copyShareLink = async () => {
        posthog.capture('button_clicked', { button_name: 'Save & Copy link' });
        if (!baseUrl || !code || sharing || !user) {
            if (!user) setShowSignInModal(true);
            return;
        }
        try {
            setSharing(true);
            const id = shareId ?? ensureShareId();

            const shaderRef = doc(db, 'shaders', id);
            const shaderSnap = await getDoc(shaderRef);
            
            if (shaderSnap.exists()) {
                if (shaderSnap.data().authorUid === user.uid) {
                    await updateDoc(shaderRef, { code });
                }
            } else {
                await setDoc(shaderRef, {
                    code,
                    authorUid: user.uid,
                    timestamp: Date.now(),
                    likes: 0,
                });
            }

            // Capture and save thumbnail
            if (canvasRef.current) {
                try {
                    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
                    const thumbRef = doc(db, 'shader_thumbnails', id);
                    await setDoc(thumbRef, { base64: dataUrl });
                } catch (err) {
                    console.error('Failed to capture thumbnail', err);
                }
            }

            const url = `${baseUrl}/editor?id=${encodeURIComponent(id)}`;

            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                // Fallback for environments without Clipboard API (e.g., http, older browsers)
                const textarea = document.createElement('textarea');
                textarea.value = url;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
        } catch (err) {
            console.error('Failed to copy link', err);
        } finally {
            setSharing(false);
        }
    };

    const shareToCommunity = async () => {
        posthog.capture('button_clicked', { button_name: 'Share to Community - Publish' });
        if (!code || sharingToCommunity || !communityTitle || !user) return;
        try {
            setSharingToCommunity(true);
            setCommunityShareError('');
            
            // Validate the shader before sharing
            const ck = await import('@/lib/canvaskit').then(m => m.loadCanvasKit());
            const effect = ck.RuntimeEffect.Make(code);
            if (!effect) {
                setCommunityShareError("Cannot share a broken shader! Please fix the compilation errors first.");
                setSharingToCommunity(false);
                return;
            }
            effect.delete(); // Free memory

            const id = shareId ?? ensureShareId();

            const shaderRef = doc(db, 'shaders', id);
            const shaderSnap = await getDoc(shaderRef);
            
            const shaderData = {
                code,
                title: communityTitle,
                author: user.displayName || 'Anonymous',
                authorUid: user.uid,
                timestamp: Date.now(),
                isPublic: true,
            };

            if (shaderSnap.exists()) {
                if (shaderSnap.data().authorUid === user.uid) {
                    await updateDoc(shaderRef, shaderData);
                } else {
                    console.error('Cannot update a shader you do not own');
                    return;
                }
            } else {
                await setDoc(shaderRef, {
                    ...shaderData,
                    likes: 0
                });
            }

            // Capture and save thumbnail
            if (canvasRef.current) {
                try {
                    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
                    const thumbRef = doc(db, 'shader_thumbnails', id);
                    await setDoc(thumbRef, { base64: dataUrl });
                } catch (err) {
                    console.error('Failed to capture thumbnail', err);
                }
            }

            setCommunityShareSuccess(true);
            setTimeout(() => {
                setShowCommunityModal(false);
                setCommunityShareSuccess(false);
            }, 2000);
        } catch (err) {
            console.error('Failed to share to community', err);
        } finally {
            setSharingToCommunity(false);
        }
    };

    const copyCode = async () => {
        posthog.capture('button_clicked', { button_name: 'Copy code' });
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

    const minPaneWidth = 240;
    const getMaxEditorWidth = useCallback(() => {
        const containerWidth = containerRef.current?.getBoundingClientRect().width || window.innerWidth || 1920;
        return Math.max(minPaneWidth, containerWidth - minPaneWidth);
    }, [minPaneWidth]);
    const clampWidth = useCallback(
        (value: number) => Math.max(minPaneWidth, Math.min(value, getMaxEditorWidth())),
        [getMaxEditorWidth, minPaneWidth]
    );

    // After mount, update to preferred/stored/percentage width
    useEffect(() => {
        setTimeout(() => {
            const stored = window.localStorage.getItem('editorWidth');
            if (stored) {
                setEditorWidth(clampWidth(parseInt(stored, 10)));
            } else {
                const viewportW = window.innerWidth || 1920;
                const px = Math.max(minPaneWidth, Math.min(viewportW * defaultEditorPercent, viewportW - minPaneWidth));
                setEditorWidth(clampWidth(px));
            }
        }, 0);
    }, [clampWidth, defaultEditorPercent, minPaneWidth]);

    // Clamp width on window resize to avoid handle drifting outside preview.
    useEffect(() => {
        const handleResize = () => setEditorWidth((prev) => clampWidth(prev));
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [clampWidth]);

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
            newWidth = clampWidth(newWidth);
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
            newWidth = clampWidth(newWidth);
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
    }, [dragging, editorWidth, clampWidth]);

    const startDragging = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setDragging(true);
    };

    return (
        <>
            <div ref={containerRef} className="flex h-screen w-full bg-zinc-950 select-none relative">
                {/* Mobile Warning Overlay */}
                {showMobileOverlay && (
                    <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 md:hidden">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                            <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">Best on Desktop</h3>
                            <p className="text-zinc-400 leading-relaxed mb-8">
                                Skia Labs is optimized for larger screens. You can view shaders here, but coding on mobile is not recommended.
                            </p>
                            <button
                                onClick={dismissMobileOverlay}
                                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
                            >
                                Continue anyway
                            </button>
                        </div>
                    </div>
                )}
                {isFetchingShader && (
                    <div className="absolute inset-0 z-[45] bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-zinc-400 font-medium animate-pulse">Loading shader...</p>
                    </div>
                )}
                {/* Editor Pane */}
                <div
                    style={{ width: editorWidth, minWidth: 240 }}
                    className="h-full border-r border-zinc-300 bg-white shrink-0 overflow-hidden"
                >
                    <Editor
                        height="100%"
                        defaultLanguage="sksl"
                        value={code}
                        onChange={(value) => {
                            if (!value) return;
                            setCode(value);
                            setHasUserEdited(true);
                        }}
                        beforeMount={registerSkslLanguage}
                        theme="sksl-dark"
                        options={{ minimap: { enabled: false }, padding: { top: 64 } }}
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
                <div className={`flex-1 bg-zinc-950 h-full min-w-[240px]${dragging ? ' pointer-events-none' : ''}`}>
                    <div className="flex flex-col h-full">
                        <div className="flex-1">
                            <ShaderRenderer code={code} canvasRef={canvasRef} />
                        </div>
                        <div className="border-t border-zinc-800 bg-zinc-900 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-zinc-300">Share this shader</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                            <button
                                    onClick={copyCode}
                                    disabled={!code}
                                    className="text-sm px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                >
                                    Copy code
                                </button>
                                <button
                                    onClick={copyShareLink}
                                    disabled={!shareLink || sharing}
                                    className="text-sm px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                >
                                    {sharing ? 'Saving…' : 'Save & Copy link'}
                                </button>
                                {user ? (
                                    <button
                                        onClick={() => {
                                            posthog.capture('button_clicked', { button_name: 'Share to Community - Open Modal' });
                                            setShowCommunityModal(true);
                                        }}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm font-medium rounded-md shadow-sm transition-all"
                                    >
                                        Share to Community
                                    </button>
                                ) : (
                                    <div className="text-zinc-500 text-sm italic">
                                        Sign in to share
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showCommunityModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-black/40 border border-white/20 backdrop-blur-xl rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4 text-white">
                        <h3 className="text-xl font-bold mb-4">Share to Community</h3>
                        
                        {communityShareSuccess ? (
                            <div className="py-4 text-center text-green-400 font-medium flex flex-col items-center gap-2">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Successfully shared!
                            </div>
                        ) : (
                            <>
                                {communityShareError && (
                                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-500 text-sm mb-2">
                                        {communityShareError}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-1">Title <span className="text-pink-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={communityTitle} 
                                        onChange={e => setCommunityTitle(e.target.value)}
                                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-zinc-500" 
                                        placeholder="e.g. Neon Waves" 
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-2 justify-end mt-4">
                                    <button 
                                        onClick={() => {
                                            setShowCommunityModal(false);
                                            setCommunityShareError('');
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={shareToCommunity}
                                        disabled={!communityTitle || sharingToCommunity}
                                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg disabled:opacity-50"
                                    >
                                        {sharingToCommunity ? 'Sharing...' : 'Publish'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            <SignInModal 
                isOpen={showSignInModal}
                onClose={() => setShowSignInModal(false)}
                title="Sign in to Share"
                message="You need to sign in with your Google account to save and share your amazing shaders with the world."
            />
        </>
    );
}