'use client';
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

export default function EditorPage() {
    return (
        <div className="grid min-h-screen grid-cols-2 bg-zinc-100">
            <div className="border-r border-zinc-300 bg-white">
                <Editor
                    height="100vh"
                    defaultLanguage="sksl"
                    defaultValue={`// kind=shader
uniform float iTime;
uniform float2 iResolution;

half4 main(float2 fragCoord) {
    // Normalized pixel coordinates (from 0 to 1)
    float2 uv = fragCoord / iResolution.xy;

    // Time varying pixel color
    float3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + float3(0, 2, 4));

    // Output to screen
    return half4(col, 1.0);
}
`}
                    beforeMount={registerSkslLanguage}
                    theme="sksl-dark"
                    options={{ minimap: { enabled: false } }}
                />
            </div>
            <div className="bg-zinc-50" />
        </div>
    );
}