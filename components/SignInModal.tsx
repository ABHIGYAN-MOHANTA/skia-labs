import { useAuth } from '@/contexts/AuthContext';

export function SignInModal({
    isOpen,
    onClose,
    title,
    message,
}: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
}) {
    const { signIn } = useAuth();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold">{title}</h3>
                </div>
                
                <p className="text-zinc-400 mb-2">
                    {message}
                </p>

                <div className="flex gap-3 justify-end mt-2">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors rounded-lg flex-1"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            signIn();
                            onClose();
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg flex-1 shadow-lg shadow-purple-500/20"
                    >
                        Sign In
                    </button>
                </div>
            </div>
        </div>
    );
}
