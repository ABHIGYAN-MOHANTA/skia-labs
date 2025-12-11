'use client';
import Editor from '@monaco-editor/react';

export default function EditorPage() {
    return (
        <div className="grid min-h-screen grid-cols-2 bg-zinc-100">
            <div className="border-r border-zinc-300 bg-white">
                <Editor
                    height="100vh"
                    defaultLanguage="sksl"
                    defaultValue="// Write SKSL code here"
                    theme="vs-dark"
                    options={{ minimap: { enabled: false } }}
                />
            </div>
            <div className="bg-zinc-50" />
        </div>
    );
}