'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { loadCanvasKit } from '@/lib/canvaskit';
import type { CanvasKit, RuntimeEffect, Shader } from 'canvaskit-wasm';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, increment, setDoc, query, where, arrayUnion, arrayRemove, deleteDoc, orderBy, limit, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { shaderExamples } from '../shaderExamples';

interface ShaderDoc {
    id: string;
    title: string;
    author: string;
    authorUid: string;
    code: string;
    likes: number;
    likedBy?: string[];
    timestamp: number;
}

interface Comment {
    id?: string;
    author: string;
    authorUid?: string;
    text: string;
    timestamp: number;
}

function ShaderPreview({ code }: { code: string }) {
    const [canvasRef, isIntersecting] = useIntersectionObserver<HTMLCanvasElement>();
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const handleVisibilityChange = () => setIsVisible(document.visibilityState === 'visible');
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);
    
    useEffect(() => {
        if (!isIntersecting || !isVisible) return;

        let ck: CanvasKit;
        let surface: any;
        let effect: RuntimeEffect | null = null;
        let shader: Shader | null = null;
        let animationFrameId: number;
        let startTime = Date.now();
        let isActive = true;

        const init = async () => {
            ck = await loadCanvasKit();
            if (!isActive) return;

            const canvas = canvasRef.current;
            if (!canvas) return;
            
            surface = ck.MakeCanvasSurface(canvas as any);
            if (!surface) return;

            effect = ck.RuntimeEffect.Make(code);
            if (!effect) return;

            const drawFrame = () => {
                if (!isActive || !surface || !effect || !canvasRef.current) return;
                
                try {
                    const skcanvas = surface.getCanvas();
                    const paint = new ck.Paint();
                    const time = (Date.now() - startTime) / 1000;
                    
                    shader = effect.makeShader([
                        time,
                        canvasRef.current.width,
                        canvasRef.current.height
                    ]);
                    
                    if (shader) {
                        paint.setShader(shader);
                        skcanvas.drawRect(ck.LTRBRect(0, 0, canvasRef.current.width, canvasRef.current.height), paint);
                        surface.flush();
                        shader.delete();
                        shader = null;
                    }
                    paint.delete();
                    animationFrameId = requestAnimationFrame(drawFrame);
                } catch (err) {
                    console.error("Shader render error:", err);
                    isActive = false;
                }
            };
            
            drawFrame();
        };

        init();

        return () => {
            isActive = false;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (shader) shader.delete();
            if (effect) effect.delete();
            if (surface) surface.delete();
        };
    }, [code, isIntersecting, isVisible]);

    return (
        <canvas 
            ref={canvasRef} 
            className="w-full h-full object-cover"
            width={400}
            height={225}
        />
    );
}

export default function CommunityPage() {
    const [shaders, setShaders] = useState<ShaderDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const { user } = useAuth();
    
    // Comments modal state
    const [activeShaderId, setActiveShaderId] = useState<string | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');
    const [newCommentAuthor, setNewCommentAuthor] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<{type: 'shader' | 'comment', id: string} | null>(null);

    const fetchShaders = async (isLoadMore = false) => {
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);

        try {
            const q = isLoadMore && lastDoc
                ? query(collection(db, 'shaders'), orderBy('likes', 'desc'), startAfter(lastDoc), limit(12))
                : query(collection(db, 'shaders'), orderBy('likes', 'desc'), limit(12));

            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                setHasMore(false);
                return;
            }

            setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
            
            const shadersData: ShaderDoc[] = [];
            const userLikes = new Set(likedIds);
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.isPublic || data.title) {
                    shadersData.push({ id: doc.id, ...data } as ShaderDoc);
                    if (user && data.likedBy && data.likedBy.includes(user.uid)) {
                        userLikes.add(doc.id);
                    }
                }
            });

            if (isLoadMore) {
                setShaders(prev => [...prev, ...shadersData]);
            } else {
                setShaders(shadersData);
            }
            
            setLikedIds(userLikes);
            
            if (querySnapshot.docs.length < 12) {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Error fetching shaders:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchShaders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleLike = async (id: string) => {
        if (!user) {
            alert("Please sign in to like shaders!");
            return;
        }

        const isLiked = likedIds.has(id);
        const shaderRef = doc(db, 'shaders', id);

        // Optimistic update
        setShaders(prev => prev.map(s => s.id === id ? { ...s, likes: s.likes + (isLiked ? -1 : 1) } : s));
        const newLikedIds = new Set(likedIds);
        if (isLiked) {
            newLikedIds.delete(id);
        } else {
            newLikedIds.add(id);
        }
        setLikedIds(newLikedIds);

        try {
            await updateDoc(shaderRef, {
                likes: increment(isLiked ? -1 : 1),
                likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
            });
        } catch (err) {
            console.error('Failed to like', err);
            // Revert optimistic update on failure
            setShaders(prev => prev.map(s => s.id === id ? { ...s, likes: s.likes + (isLiked ? 1 : -1) } : s));
            setLikedIds(likedIds);
        }
    };

    const performDeleteShader = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'shaders', id));
            setShaders(prev => prev.filter(s => s.id !== id));
            setDeleteConfirm(null);
        } catch (err) {
            console.error('Failed to delete shader', err);
        }
    };

    const performDeleteComment = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'comments', id));
            setComments(prev => prev.filter(c => c.id !== id));
            setDeleteConfirm(null);
        } catch (err) {
            console.error('Failed to delete comment', err);
        }
    };

    const openComments = async (id: string) => {
        setActiveShaderId(id);
        setLoadingComments(true);
        setComments([]);
        try {
            const q = query(collection(db, 'comments'), where('shaderId', '==', id));
            const querySnapshot = await getDocs(q);
            const commentsData: Comment[] = [];
            querySnapshot.forEach((doc) => {
                commentsData.push({ id: doc.id, ...doc.data() } as Comment);
            });
            commentsData.sort((a, b) => a.timestamp - b.timestamp);
            setComments(commentsData);
        } catch (err) {
            console.error('Error fetching comments:', err);
        } finally {
            setLoadingComments(false);
        }
    };

    const postComment = async () => {
        if (!activeShaderId || !newCommentText.trim()) return;

        const commentText = newCommentText;
        // Use authenticated user's name if available, fallback to provided or Anonymous
        const commentAuthor = user ? user.displayName : (newCommentAuthor || 'Anonymous');
        const newDocRef = doc(collection(db, 'comments'));
        const newId = newDocRef.id;
        const commentTimestamp = Date.now();
        
        // Optimistic update
        const tempComment: Comment = {
            id: newId,
            author: commentAuthor || 'Anonymous',
            authorUid: user ? user.uid : undefined,
            text: commentText,
            timestamp: commentTimestamp
        };
        setComments(prev => [...prev, tempComment]);
        setNewCommentText('');
        if (!user) setNewCommentAuthor('');

        try {
            await setDoc(newDocRef, {
                shaderId: activeShaderId,
                text: commentText,
                author: commentAuthor,
                authorUid: user ? user.uid : null,
                timestamp: commentTimestamp
            });
        } catch (err) {
            console.error('Error posting comment:', err);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-8 pt-24 sm:p-12 sm:pt-28">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-0 mb-12">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight mb-2">Community Shaders</h2>
                            <p className="text-zinc-500 dark:text-zinc-400">Explore and remix creations from the community.</p>
                        </div>
                    </div>
                    <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back to Home
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : shaders.length === 0 ? (
                    <div className="text-center py-24 text-zinc-500 dark:text-zinc-400">
                        <p className="text-lg">No community shaders yet.</p>
                        <p className="mt-2">Be the first to share one from the <Link href="/editor" className="text-purple-500 hover:underline">Editor</Link>!</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {shaders.map(shader => (
                                <div key={shader.id} className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col group">
                                    <div className="aspect-video relative bg-zinc-100 dark:bg-black">
                                        <ShaderPreview code={shader.code} />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                    </div>
                                    <div className="p-5 flex flex-col flex-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg leading-tight mb-1">{shader.title}</h3>
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400">by {shader.author}</p>
                                            </div>
                                            {user && shader.authorUid === user.uid && (
                                                <button 
                                                    onClick={() => setDeleteConfirm({ type: 'shader', id: shader.id })}
                                                    className="text-zinc-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                    title="Delete shader"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="mt-auto pt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => handleLike(shader.id)}
                                                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${likedIds.has(shader.id) ? 'text-pink-500' : 'text-zinc-500 hover:text-pink-500 dark:text-zinc-400 dark:hover:text-pink-400'}`}
                                                >
                                                    <svg className="w-5 h-5" fill={likedIds.has(shader.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={likedIds.has(shader.id) ? 0 : 2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                    </svg>
                                                    <span>{shader.likes}</span>
                                                </button>
                                                <button 
                                                    onClick={() => openComments(shader.id)}
                                                    className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                    </svg>
                                                    <span>Discuss</span>
                                                </button>
                                            </div>
                                            <Link 
                                                href={`/editor?id=${shader.id}`}
                                                className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                                            >
                                                {user && shader.authorUid === user.uid ? 'Edit' : 'Open in Editor'}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {hasMore && shaders.length > 0 && (
                            <div className="flex justify-center mt-8">
                                <button
                                    onClick={() => fetchShaders(true)}
                                    disabled={loadingMore}
                                    className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full font-medium shadow-sm hover:bg-zinc-800 dark:hover:bg-white transition-colors disabled:opacity-70 flex items-center gap-2"
                                >
                                    {loadingMore ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white dark:border-zinc-900 border-t-transparent rounded-full animate-spin" />
                                            Loading...
                                        </>
                                    ) : (
                                        'Load More Shaders'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Comments Modal */}
            {activeShaderId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Comments</h2>
                            <button 
                                onClick={() => setActiveShaderId(null)}
                                className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loadingComments ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : comments.length === 0 ? (
                                <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">No comments yet. Be the first!</p>
                            ) : (
                                comments.map((comment, i) => (
                                    <div key={i} className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-bold text-sm text-zinc-900 dark:text-white">{comment.author}</span>
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    {new Date(comment.timestamp).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {user && comment.authorUid === user.uid && comment.id && (
                                                <button 
                                                    onClick={() => setDeleteConfirm({ type: 'comment', id: comment.id! })}
                                                    className="text-zinc-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                    title="Delete comment"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{comment.text}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                            <div className="flex flex-col gap-3">
                                {!user && (
                                    <input 
                                        type="text"
                                        placeholder="Your Name (optional)"
                                        value={newCommentAuthor}
                                        onChange={e => setNewCommentAuthor(e.target.value)}
                                        className="w-full bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                )}
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        placeholder="Add a comment..."
                                        value={newCommentText}
                                        onChange={e => setNewCommentText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && postComment()}
                                        className="flex-1 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button 
                                        onClick={postComment}
                                        disabled={!newCommentText.trim()}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        Post
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-2">Delete {deleteConfirm.type === 'shader' ? 'Shader' : 'Comment'}?</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mb-6">
                            Are you sure you want to delete this {deleteConfirm.type}? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 rounded-lg font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    if (deleteConfirm.type === 'shader') {
                                        performDeleteShader(deleteConfirm.id);
                                    } else {
                                        performDeleteComment(deleteConfirm.id);
                                    }
                                }}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
