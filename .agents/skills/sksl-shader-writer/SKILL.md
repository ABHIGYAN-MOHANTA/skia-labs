---
name: sksl-shader-writer
description: Write SKSL (Skia Shading Language) shaders for the Skia Labs playground. Use this skill when asked to create, debug, or modify procedural shaders, animations, or fragment shaders.
---

# SKSL Shader Writing Guide for Skia Labs

When the user asks you to write a shader for Skia Labs, follow these specific SKSL conventions, which differ slightly from standard GLSL (like Shadertoy).

## 1. Required Uniforms and Signature
Every shader in Skia Labs must include these uniforms and the exact `main` signature:

```glsl
// kind=shader
// Skia Labs provides iTime (seconds) and iResolution (width,height); keep these uniform.
uniform float iTime;
uniform float2 iResolution;

half4 main(float2 fragCoord) {
    // 1. Normalize pixel coordinates (from 0 to 1)
    float2 uv = fragCoord / iResolution.xy;

    // 2. Compute pixel color (RGB)
    float3 col = float3(0.0);

    // ... shader logic here ...

    // 3. Return as half4 (RGBA)
    return half4(col, 1.0);
}
```

## 2. Syntax Differences (SKSL vs GLSL)
- **Coordinate System (CRITICAL)**: Skia's Y-axis is inverted compared to Shadertoy. In Skia, `fragCoord.y = 0` is the **TOP** of the screen (positive Y goes down). However, the **X-axis is standard** (left-to-right).
  - To prevent upside-down rendering, you MUST invert the Y-axis immediately after normalization:
    ```glsl
    float2 p = (fragCoord / iResolution.xy) * 2.0 - 1.0;
    p.y = -p.y; // FLIP Y-AXIS TO MATCH SHADERTOY
    p.x *= iResolution.x / iResolution.y;
    ```
  - **Note on Polar Angles**: Standard trigonometry (`atan(p.y, p.x)`) increases counter-clockwise (CCW). Adding time to an angle (`angle + time`) rotates it CCW. 
  - **Clockwise Spinners & Comets**: To make a comet spinner rotate clockwise (CW) with the head leading correctly, you must subtract BOTH the angle and the time:
    ```glsl
    // Clockwise Comet (Head leads, tail trails)
    float arc = fract((-angle - iTime) / (2.0 * PI));
    float comet = smoothstep(0.0, 1.0, arc); // Tail at 0, Head at 1
    ```
    If you mix up the signs (e.g., `-angle + iTime`), the comet will fly **tail-first backwards** in the CCW direction!
- **Vector Types**: Use `float2`, `float3`, `float4` instead of `vec2`, `vec3`, `vec4`.
- **Return Type**: The main function must return a `half4` representing RGBA.
- **Color Outputs**: Use `half4(col, 1.0)` or `float4(col, 1.0)` to return the final pixel color.
- **No Preprocessor Macros**: SKSL does NOT support `#define` for constants. You MUST use `const float` (e.g., `const float PI = 3.14159;`).
- **Type Strictness**: SKSL is stricter than GLSL. Always write floats with decimals (e.g., `1.0` instead of `1`). Do not implicitly mix `int` and `float`.
- **Uniform Declarations (CRITICAL)**: Unlike Shadertoy where `iTime` and `iResolution` are magically provided, in Skia Labs you MUST explicitly declare them at the top of your shader (before `main`). Failure to do this will cause massive cascading `unknown identifier` errors:
  ```glsl
  uniform float iTime;
  uniform float2 iResolution;
  ```

## 3. Useful Built-in Functions
- Math: `sin`, `cos`, `tan`, `abs`, `pow`, `exp`, `log`, `sqrt`, `length`, `fract`, `floor`, `atan`
- Interpolation/Clamping: `min`, `max`, `clamp`, `mix`, `step`, `smoothstep`
- Vector Ops: `dot`, `cross`, `normalize`

## 4. Reference Examples

### Example 1: Color Waves
A basic time-varying color gradient.
```glsl
// kind=shader
uniform float iTime;
uniform float2 iResolution;

half4 main(float2 fragCoord) {
    float2 uv = fragCoord / iResolution.xy;
    float3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + float3(0, 2, 4));
    col *= 0.6; // darken slightly
    return half4(col, 1.0);
}
```

### Full Example Library
Because Skia Labs contains thousands of lines of advanced examples (like Hyper Tunnel, Raymarching, and FBM Clouds), this skill includes a supplementary reference file. You **MUST** read the `references/shaderExamples.ts` file located in this skill's directory if you need to learn advanced techniques or reference complex mathematical structures in SKSL.

## 5. Advanced Techniques & Learnings
- **Raymarching & Analytical Intersections:** While complex `while`-loop raymarching can hit unrolling limits in SKSL, analytical ray-sphere intersections are highly performant. Use the standard quadratic formula `h = b*b - c` where `b = dot(oc, rd)` to find intersection depths.
- **Procedural Environment Mapping:** You can simulate true 3D glass refraction and reflection by calculating a 3D ray hit and normal (`N`), getting the reflection/refraction vectors (`refract(rd, N, 0.7)`), and mapping their `.xy` coordinates into a 2D procedural background function (e.g., FBM noise clouds).
- **Perspective Distortion Corrections:** When combining a 3D perspective camera (`rd = normalize(float3(p, -1.5))`) with 2D post-processing effects (like an outer glow `exp(-dist)`), the visual screen radius of a 3D sphere is smaller than its physical radius. You MUST calculate the visual screen radius: `float visualRadius = focalLength * tan(asin(physicalRadius / distanceToCamera))` to align your 2D glows precisely with the 3D object edge.
- **Exact Shape Math:** Instead of soft cosine approximations, use modular math for perfect sharp shapes. For an exact 5-pointed star: `float P = PI / 5.0; float starVal = (1.0 / P) * (P - abs(mod(atan(p.x, p.y) + PI, 2.0 * P) - P));`

## 6. Workflow Instructions & Agent Mandates
- **NO LAZINESS / NO PLACEHOLDERS:** Do not leave comments like `// ... rest of code here ...` or attempt to output partial snippets. You MUST output the ENTIRE, fully functioning, complete code block every single time. The user relies on you to provide flawlessly copy-pasteable code without requiring them to stitch logic together.
- **DOUBLE-CHECK YOUR MATH:** Before outputting any shader, mentally run through your coordinate mapping, fades (`smoothstep` directionality), and signs (`+` vs `-`). Ensure objects are not rendering upside-down, spinning backwards, or fading inversely. Catch your own logic bugs.
- **VERIFY COMPILATION & TYPES:** Skia SKSL requires strict typing. You must ensure you did not mix floats and ints implicitly, and that all matrix/vector constructions (`float2x2`, `float3`, etc.) use the correct SKSL syntax.
- **FULL CODE PROVISION:** Always start your code block with `// kind=shader` down to the closing brace of the `main` function.
- **IMPORTING FROM SHADERTOY:** Manually convert `vecN` to `floatN`, `matN` to `floatNxN`, and replace `fragCoord` logic. Avoid unsupported GLSL features (e.g., `texture2D` without a provided sampler, or buffer passes).
