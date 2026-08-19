# Skia SKSL Shader Writer Skill

An AI agent skill designed to teach coding assistants (like Cursor, Claude Code, GitHub Copilot, and Antigravity) how to write properly formatted, high-performance SKSL (Skia Shading Language) shaders.

## Why this skill?
Standard GLSL shaders (such as those from Shadertoy) often fail or render incorrectly when used with Skia due to specific syntax and coordinate system differences. This skill provides your AI agent with the procedural knowledge needed to:

- Properly handle Skia's inverted Y-axis.
- Use the correct uniform bindings (`iTime` and `iResolution`).
- Use the strict typing required by SKSL (`half4`, `float2`, explicit decimals).
- Avoid implicit casts and unsupported macros.
- Use advanced mathematical approaches optimized for SKSL.

## Installation

Install this skill into your project using the `skills` CLI:

```bash
npx skills add abhigyan-mohanta/sksl-writer
```

Once installed, the skill will be available in your `.agents/skills` directory, and your AI coding assistant will automatically load its context whenever you ask it to create or modify procedural shaders!

## Usage

Simply ask your AI assistant:
- *"Write a water ripple shader for Skia Labs"*
- *"Can you convert this Shadertoy GLSL code to SKSL for me?"*
- *"Create a procedural background shader using FBM noise"*

The agent will automatically use the knowledge in this skill to produce copy-pasteable, error-free SKSL code.

## Included Examples
This skill includes a comprehensive reference library of advanced shaders (such as Raymarching, Fractals, and Procedural Generation) that the AI can reference when constructing complex visual effects.
