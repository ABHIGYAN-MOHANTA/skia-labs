export type ShaderExample = {
    title: string;
    code: string;
    tag?: 'Simple' | 'Intermediate' | 'Advanced' | 'Interactive';
};

export const shaderExamples: ShaderExample[] = [
    {
        title: 'Interactive Mouse',
        tag: 'Interactive',
        code: `// kind=shader

uniform float iTime;
uniform float2 iResolution;
uniform float4 iMouse;

half4 main(float2 fragCoord) {

    // Normalize coordinates
    float2 uv =
        fragCoord / iResolution.xy;

    float2 mouseUv =
        iMouse.xy / iResolution.xy;


    // Correct for non-square canvas
    float aspect =
        iResolution.x / iResolution.y;

    uv.x *= aspect;
    mouseUv.x *= aspect;


    // Distance from pixel to mouse
    float dist =
        distance(
            uv,
            mouseUv
        );


    // Glowing circle
    float circle =
        0.08 / max(dist, 0.001);


    // Background
    float3 bg =
        float3(
            uv.x * 0.15,
            uv.y * 0.15,
            0.2
        );


    // Mouse color
    float3 mouseGlow =
        iMouse.z > 0.0
        ?
        float3(circle, 0.0, 0.0)
        :
        float3(0.0, 0.2, circle);


    return half4(
        bg + mouseGlow,
        1.0
    );
}`
    },
    {
        title: 'Color Waves',
        tag: 'Simple',
        code: `// kind=shader
// Skia Labs provides iTime (seconds) and iResolution (width,height); keep these uniform.
uniform float iTime;
uniform float2 iResolution;
half4 main(float2 fragCoord) {
    float2 uv = fragCoord / iResolution.xy;
    float3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + float3(0, 2, 4));
    col *= 0.6;
    return half4(col, 1.0);
}`
    },
    {
        title: 'Pattern Gradient',
        tag: 'Simple',
        code: `// kind=shader
// Skia Labs provides iTime (seconds) and iResolution (width,height); keep these uniform.
uniform float iTime;
uniform float2 iResolution;
half4 main(float2 fragCoord) {
    float2 uv = fragCoord / iResolution.xy;
    float pattern = sin(uv.x * 20.0 + iTime) * cos(uv.y * 20.0 + iTime);
    float gradient = uv.x;
    float combined = pattern * gradient;
    float3 col = float3(combined);
    col *= 0.5;
    return half4(col, 1.0);
}`
    },
    {
        title: 'Psychedelic Tunnel',
        tag: 'Simple',
        code: `// kind=shader
// Skia Labs provides iTime (seconds) and iResolution (width,height); keep these uniform.
uniform float iTime;
uniform float2 iResolution;
half4 main(float2 fragCoord) {
    float2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);
    float depth = 1.0 / (dist + 0.1) - iTime * 2.0;
    float spiral = sin(angle * 5.0 + depth * 3.0);
    float rings = sin(depth * 10.0) * 0.5 + 0.5;
    float3 col = float3(
        0.5 + 0.5 * sin(depth + angle + iTime),
        0.5 + 0.5 * sin(depth * 2.0 - angle + iTime * 1.5),
        0.5 + 0.5 * sin(depth * 3.0 + angle * 2.0 - iTime * 2.0)
    );
    col *= (spiral * 0.3 + 0.7) * (rings * 0.5 + 0.5);
    col *= 1.0 - dist * 0.5;

    col *= 0.6;

    return half4(col, 1.0);
}`
    },
    {
        title: 'Cloudy Sky',
        tag: 'Intermediate',
        code: `// kind=shader
uniform float iTime;
uniform float2 iResolution;

// --- Simple smooth noise ---
float hash(float2 p) {
    return fract(sin(dot(p, float2(23.43, 89.19))) * 45245.233);
}

float noise(float2 p) {
    float2 i = floor(p);
    float2 f = fract(p);

    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + float2(1.0, 0.0));
    float c = hash(i + float2(0.0, 1.0));
    float d = hash(i + float2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// --- FBM clouds ---
float fbm(float2 p) {
    float f = 0.0;
    float amp = 0.5;

    for (int i = 0; i < 5; i++) {
        f += noise(p) * amp;
        p *= 2.0;
        amp *= 0.5;
    }
    return f;
}

half4 main(float2 fragCoord) {
    float2 uv = fragCoord / iResolution.xy;

    // Center & aspect-correct
    uv = uv * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    // Base sky gradient
    float3 col = mix(
        float3(0.15, 0.25, 0.45), // top
        float3(0.7, 0.85, 1.0),   // near horizon
        smoothstep(-1.2, 0.6, uv.y)
    );

    // Cloud layer
    float time = iTime * 0.03;
    float clouds = fbm(uv * 1.9 + float2(time, 0.0));

    // Thickness mask
    float cMask = smoothstep(0.4, 0.75, clouds);

    // Soft white clouds
    col = mix(col, float3(1.0, 1.0, 1.0), cMask * 0.6);

    // Sun glow
    float2 sunDir = float2(0.3, 0.5);
    float d = length(uv - sunDir);
    float glow = exp(-d * 4.0);
    col += float3(1.2, 1.0, 0.8) * glow * 0.3;

    return half4(col, 1.0);
}
`
    },
    {
        title: 'Hyper Tunnel',
        tag: 'Advanced',
        code: `// kind=shader
uniform float iTime;
uniform float2 iResolution;

const float FAR = 1000.0;
const float INFINITY_VALUE = 1e32;

const float FOV = 70.0;
const float FOG = 0.06;

const float PI = 3.14159265;
const float TAU = 6.28318530;
const float PHI = 1.61803398875;


// ============================================================
// Hash
// ============================================================

float hash12(float2 p) {

    float h =
        dot(
            p,
            float2(
                127.1,
                311.7
            )
        );

    return fract(
        sin(h) *
        43758.5453123
    );
}


// ============================================================
// 3D noise
// ============================================================

float noise3(float3 p) {

    float3 i =
        floor(p);

    float3 f =
        fract(p);

    // Equivalent to the original:
    // u = 1.-(--f)*f*f*f*-f;
    //
    // This expands to the smoother interpolation used there.
    float3 u =
        f * f * f *
        (
            f *
            (
                f * -1.0 +
                2.0
            )
        );

    float2 ii =
        i.xy +
        i.z *
        5.0;

    float a =
        hash12(
            ii +
            float2(
                0.0,
                0.0
            )
        );

    float b =
        hash12(
            ii +
            float2(
                1.0,
                0.0
            )
        );

    float c =
        hash12(
            ii +
            float2(
                0.0,
                1.0
            )
        );

    float d =
        hash12(
            ii +
            float2(
                1.0,
                1.0
            )
        );

    float v1 =
        mix(
            mix(a, b, u.x),
            mix(c, d, u.x),
            u.y
        );

    ii += 5.0;

    a =
        hash12(
            ii +
            float2(
                0.0,
                0.0
            )
        );

    b =
        hash12(
            ii +
            float2(
                1.0,
                0.0
            )
        );

    c =
        hash12(
            ii +
            float2(
                0.0,
                1.0
            )
        );

    d =
        hash12(
            ii +
            float2(
                1.0,
                1.0
            )
        );

    float v2 =
        mix(
            mix(a, b, u.x),
            mix(c, d, u.x),
            u.y
        );

    return max(
        mix(
            v1,
            v2,
            u.z
        ),
        0.0
    );
}


// ============================================================
// FBM
// ============================================================

float fbm(float3 x) {

    float r = 0.0;
    float w = 1.0;
    float s = 1.0;

    for (int i = 0; i < 4; i++) {

        w *= 0.25;
        s *= 3.0;

        r +=
            w *
            noise3(
                s * x
            );
    }

    return r;
}


// ============================================================
// Tunnel centerline
// ============================================================

float yC(float x) {

    return
        cos(x * -0.134) *
        1.0 *
        sin(x * 0.13) *
        15.0
        +
        fbm(
            float3(
                x * 0.1,
                0.0,
                0.0
            ) * 55.4
        );
}


// ============================================================
// 2D rotation
// ============================================================

float2 rot2(
    float2 p,
    float a
) {

    float c = cos(a);
    float s = sin(a);

    return float2(
        c * p.x - s * p.y,
        s * p.x + c * p.y
    );
}


// ============================================================
// Geometry data
// ============================================================

struct Geometry {
    float dist;
    float3 hit;
    float iterations;
};


// ============================================================
// Infinite cylinder
// ============================================================

float fCylinderInf(
    float3 p,
    float r
) {
    return length(p.xz) - r;
}


// ============================================================
// Scene map
// ============================================================

Geometry map(
    float3 p
) {

    // Warp around tunnel path
    p.x -=
        yC(p.y * 0.1) *
        3.0;

    p.z +=
        yC(p.y * 0.01) *
        4.0;

    float n =
        pow(
            abs(
                fbm(
                    p * 0.06
                )
            ) * 12.0,
            1.3
        );

    float s =
        fbm(
            p * 0.01 +
            float3(
                0.0,
                iTime * 0.14,
                0.0
            )
        )
        *
        128.0;

    Geometry obj;

    obj.dist =
        max(
            0.0,
            -fCylinderInf(
                p,
                s + 18.0 - n
            )
        );

    p.x -=
        sin(
            p.y * 0.02
        )
        *
        34.0
        +
        cos(
            p.z * 0.01
        )
        *
        62.0;

    obj.dist =
        max(
            obj.dist,
            -fCylinderInf(
                p,
                s + 28.0 + n * 2.0
            )
        );

    obj.hit =
        p;

    obj.iterations =
        0.0;

    return obj;
}


// ============================================================
// Ray marcher
// ============================================================

const float T_MIN = 10.0;
const float T_MAX = FAR;
const int MAX_ITERATIONS = 100;

Geometry trace(
    float3 o,
    float3 d
) {

    float omega = 1.3;
    float t = T_MIN;

    float candidateError =
        INFINITY_VALUE;

    float candidateT =
        T_MIN;

    float previousRadius =
        0.0;

    float stepLength =
        0.0;

    float pixelRadius =
        1.0 / 1000.0;

    Geometry mp =
        map(o);

    float functionSign =
        mp.dist < 0.0
            ? -1.0
            : 1.0;

    for (
        int i = 0;
        i < MAX_ITERATIONS;
        i++
    ) {

        mp =
            map(
                d * t + o
            );

        mp.iterations =
            float(i);

        float signedRadius =
            functionSign *
            mp.dist;

        float radius =
            abs(
                signedRadius
            );

        bool sorFail =
            omega > 1.0 &&
            (
                radius +
                previousRadius
            )
            <
            stepLength;

        if (sorFail) {

            stepLength -=
                omega *
                stepLength;

            omega = 1.0;

        } else {

            stepLength =
                signedRadius *
                omega;
        }

        previousRadius =
            radius;

        float error =
            radius /
            max(t, 0.0001);

        if (
            !sorFail &&
            error <
            candidateError
        ) {

            candidateT =
                t;

            candidateError =
                error;
        }

        if (
            (
                !sorFail &&
                error <
                pixelRadius
            )
            ||
            t > T_MAX
        ) {
            break;
        }

        t +=
            stepLength *
            0.5;
    }

    mp.dist =
        candidateT;

    if (
        t > T_MAX ||
        candidateError >
        pixelRadius
    ) {

        mp.dist =
            INFINITY_VALUE;
    }

    return mp;
}


// ============================================================
// Main
// ============================================================

half4 main(
    float2 fragCoord
) {

    // --------------------------------------------------------
    // Coordinates
    // --------------------------------------------------------

    float2 ouv =
        fragCoord /
        iResolution.xy;

    // Shadertoy -> Skia Y correction
    ouv.y =
        1.0 -
        ouv.y;

    float2 uv =
        ouv -
        0.5;

    uv *=
        tan(
            radians(FOV) /
            2.0
        )
        *
        4.0;


    // --------------------------------------------------------
    // Camera orientation
    // --------------------------------------------------------

    float3 vuv =
        normalize(
            float3(
                cos(iTime),
                sin(iTime * 0.11),
                sin(iTime * 0.41)
            )
        );

    float3 ro =
        float3(
            0.0,
            30.0 +
            iTime * 100.0,
            -0.1
        );

    ro.x +=
        yC(ro.y * 0.1) *
        3.0;

    ro.z -=
        yC(ro.y * 0.01) *
        4.0;

    float3 vrp =
        float3(
            0.0,
            50.0 +
            iTime * 100.0,
            2.0
        );

    vrp.x +=
        yC(vrp.y * 0.1) *
        3.0;

    vrp.z -=
        yC(vrp.y * 0.01) *
        4.0;


    float3 vpn =
        normalize(
            vrp - ro
        );

    float3 u =
        normalize(
            cross(
                vuv,
                vpn
            )
        );

    float3 v =
        cross(
            vpn,
            u
        );

    float3 vcv =
        ro +
        vpn;

    float3 scrCoord =
        vcv
        +
        uv.x *
        u *
        (
            iResolution.x /
            iResolution.y
        )
        +
        uv.y *
        v;

    float3 rd =
        normalize(
            scrCoord -
            ro
        );

    float3 oro =
        ro;


    // --------------------------------------------------------
    // Tunnel
    // --------------------------------------------------------

    float3 sceneColor =
        float3(0.0);

    Geometry tr =
        trace(
            ro,
            rd
        );

    tr.hit =
        ro +
        rd *
        tr.dist;


    // --------------------------------------------------------
    // Tunnel coloring
    // --------------------------------------------------------

    float3 col =
        float3(
            1.0,
            0.5,
            0.4
        )
        *
        fbm(
            tr.hit.xzy *
            0.01
        )
        *
        20.0;

    col.b *=
        fbm(
            tr.hit *
            0.01
        )
        *
        10.0;

    sceneColor +=
        min(
            0.8,
            tr.iterations /
            90.0
        )
        *
        col
        +
        col *
        0.03;


    // --------------------------------------------------------
    // Extra modulation
    // --------------------------------------------------------

    float modulation =
        abs(
            fbm(
                tr.hit *
                0.002 +
                3.0
            )
            *
            10.0
        )
        *
        fbm(
            float3(
                0.0,
                0.0,
                iTime * 0.05
            )
            * 2.0
        )
        *
        1.0;

    sceneColor *=
        1.0 +
        0.9 *
        modulation;


    // --------------------------------------------------------
    // Replacement for the original iChannelTime / texelFetch
    //
    // The source used:
    //
    // iChannelTime[0]
    // texelFetch(iChannel0, ivec2(...), 0)
    //
    // Those are external Shadertoy inputs unavailable in the
    // iTime/iResolution-only Skia Labs runtime.
    //
    // Use a stable time-driven intensity instead.
    // --------------------------------------------------------

    float tunnelIntensity =
        0.6 +
        0.4 *
        smoothstep(
            0.0,
            10.0,
            iTime
        );

    sceneColor *=
        tunnelIntensity;


    // --------------------------------------------------------
    // Steam
    // --------------------------------------------------------

    float3 steamColor1 =
        float3(
            0.0,
            0.4,
            0.5
        );

    float3 rro =
        oro;

    ro =
        tr.hit;

    float distC =
        tr.dist;

    float f =
        0.0;

    float st =
        0.9;

    for (
        int i = 0;
        i < 24;
        i++
    ) {

        rro =
            ro -
            rd *
            distC;

        f +=
            fbm(
                rro *
                float3(
                    0.1,
                    0.1,
                    0.1
                )
                *
                0.3
            )
            *
            0.1;

        distC -=
            3.0;

        if (distC < 3.0) {
            break;
        }
    }

    // Approximate the source's channel-driven multiplier.
    steamColor1 *=
        1.0;

    sceneColor +=
        steamColor1 *
        pow(
            abs(
                f * 1.5
            ),
            3.0
        )
        *
        4.0;


    // --------------------------------------------------------
    // Vignette / final color
    // --------------------------------------------------------

    float vignette =
        1.0 -
        length(uv) /
        2.0;

    sceneColor *=
        vignette;

    sceneColor =
        clamp(
            sceneColor,
            float3(0.0),
            float3(1.0)
        );


    // Original:
    //
    // fragColor =
    //   pow(
    //     abs(fragColor / tr.dist * 130.),
    //     vec4(.8)
    //   );
    //
    // Do the scalar component-wise equivalent.

    float scale =
        130.0 /
        max(
            tr.dist,
            0.0001
        );

    float4 finalColor =
        float4(
            sceneColor * scale,
            1.0
        );

    finalColor =
        abs(
            finalColor
        );

    finalColor =
        float4(
            pow(
                finalColor.x,
                0.8
            ),

            pow(
                finalColor.y,
                0.8
            ),

            pow(
                finalColor.z,
                0.8
            ),

            pow(
                finalColor.w,
                0.8
            )
        );

    return half4(
        finalColor
    );
}
`
    },
    {
        title: 'Starfield',
        tag: 'Advanced',
        code: `// kind=shader
uniform float iTime;
uniform float2 iResolution;

// ------------------------------------------------------------
// Hash replacement
// ------------------------------------------------------------
// The original Shadertoy shader uses floatBitsToInt() and XOR.
// Those are not supported by this RuntimeEffect environment.
//
// This preserves the purpose of the hash: deterministic,
// pseudo-random values based on a 3D position.
// ------------------------------------------------------------
float hash(float3 p) {
    float h = dot(
        p,
        float3(127.1, 311.7, 74.7)
    );

    return fract(
        sin(h) * 43758.5453123
    );
}

// ------------------------------------------------------------
// Grid distance
// ------------------------------------------------------------
void dogrid(
    float3 ro,
    float3 rd,
    float size,
    out float3 gridId,
    out float gridD
) {
    gridId =
        (floor(ro + rd * 1e-3) / size + 0.5)
        * size;

    float3 src =
        -(ro - gridId) / rd;

    float3 dst =
        abs(0.5 * size) / rd;

    float3 bz = src + dst;

    gridD = min(
        bz.x,
        min(bz.y, bz.z)
    );
}

// ------------------------------------------------------------
// Rodrigues rotation
// ------------------------------------------------------------
float3 erot(
    float3 p,
    float3 ax,
    float t
) {
    return
        mix(
            dot(ax, p) * ax,
            p,
            cos(t)
        )
        +
        cross(ax, p) * sin(t);
}

// ------------------------------------------------------------
// tanh replacement
// tanh(x) = (e^(2x)-1)/(e^(2x)+1)
//
// Clamp keeps exp() from getting excessively large.
// ------------------------------------------------------------
float tanhApprox(float x) {
    x = clamp(x, -8.0, 8.0);

    float e = exp(2.0 * x);

    return (e - 1.0) / (e + 1.0);
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------
half4 main(float2 fragCoord) {

    float2 uv =
        (fragCoord - 0.5 * iResolution.xy)
        / iResolution.y;

    float3 col = float3(0.0);

    float3 ro =
        float3(0.2, 0.2, -5.0);

    float3 rt =
        float3(0.0);

    float3 z =
        normalize(rt - ro);

    float3 x =
        normalize(
            cross(
                z,
                float3(0.0, -1.0, 0.0)
            )
        );

    float3 y =
        cross(z, x);

    // --------------------------------------------------------
    // Camera ray
    // --------------------------------------------------------

    float hv =
        hash(
            float3(
                uv.x,
                uv.y,
                uv.y
            ) + iTime
        );

    float rayZ =
        2.0 +
        tanhApprox(
            hv * 0.5 +
            10.0 * sin(iTime)
        );

    float3 camDir =
        normalize(
            float3(
                uv.x,
                uv.y,
                rayZ
            )
        );

    // Equivalent to:
    // mat3(x,y,z) * camDir
    float3 rd =
        x * camDir.x +
        y * camDir.y +
        z * camDir.z;

    float e = 0.01;
    float g = 0.0;

    float gridLen = 0.0;

    float3 gridId =
        float3(0.0);

    float gridD = 0.0;

    // --------------------------------------------------------
    // Raymarch
    // --------------------------------------------------------

    for (int iter = 0; iter < 99; iter++) {

        float i =
            float(iter + 1);

        float3 p =
            ro + rd * g;

        float3 oop = p;

        // Rotate world
        p =
            erot(
                p,
                normalize(
                    sin(
                        iTime * 0.33 +
                        float3(
                            -0.6,
                            0.4,
                            0.2
                        )
                    )
                ),
                iTime * 0.2
            );

        p.z += iTime;

        float3 op = p;

        // ----------------------------------------------------
        // Advance grid
        // ----------------------------------------------------

        if (gridLen <= g) {

            dogrid(
                p,
                rd,
                1.0,
                gridId,
                gridD
            );

            gridLen += gridD;
        }

        p -= gridId;

        // ----------------------------------------------------
        // Grid pattern
        // ----------------------------------------------------

        float3 gridIdZXY =
            float3(
                gridId.z,
                gridId.x,
                gridId.y
            );

        float gy =
            dot(
                sin(gridId * 2.0),
                cos(gridIdZXY * 5.0)
            );

        float rn =
            hash(
                gridId +
                floor(iTime)
            );

        p.x += sin(rn) * 0.25;

        // ----------------------------------------------------
        // Distance
        // ----------------------------------------------------

        float h;

        // NOTE:
        // The original uses rn > 0.0.
        // This is effectively always true because our
        // replacement hash returns [0,1).
        //
        // To preserve the original shader's intended
        // alternating behavior, create a signed hash.
        float signedRn =
            rn * 2.0 - 1.0;

        if (signedRn > 0.0) {

            h = 0.5;

        } else {

            h =
                length(p)
                - 0.01
                - gy * 0.05
                + signedRn * 0.02;
        }

        // ----------------------------------------------------
        // Raymarch step
        // ----------------------------------------------------

        e =
            max(
                0.001 +
                op.z * 0.000002,

                abs(h)
            );

        g += e;

        // ----------------------------------------------------
        // Accumulate color
        // ----------------------------------------------------

        float glow =
            exp(
                5.0 *
                fract(
                    gy + iTime
                )
            );

        col +=
            float3(
                0.25,
                0.25,
                1.0 +
                abs(signedRn)
            )
            *
            (
                0.025 +
                0.02 * glow
            )
            /
            exp(
                e * e * i
            );
    }

    // --------------------------------------------------------
    // Final shading
    // --------------------------------------------------------

    col *= exp(-0.08 * g);

    col =
        sqrt(
            max(col, float3(0.0))
        );

    return half4(
        col,
        1.0
    );
}
`
    },
    {
        title: 'Fractal Tunnel',
        tag: 'Advanced',
        code: `// kind=shader
uniform float iTime;
uniform float2 iResolution;

float hash(float x) {
    return fract(sin(x) * 43758.5453123);
}

float3 pal(float t) {
    return 0.5 + 0.5 * cos(
        6.28 * (
            t + float3(0.0, 0.1, 0.1)
        )
    );
}

float stepNoise(float x, float n) {

    const float factor = 0.3;

    float i = floor(x);
    float f = x - i;

    float u =
        smoothstep(
            0.5 - factor,
            0.5 + factor,
            f
        );

    float res =
        mix(
            floor(hash(i) * n),
            floor(hash(i + 1.0) * n),
            u
        );

    res /= (n - 1.0) * 0.5;

    return res - 1.0;
}

float3 path(float3 p) {

    float3 o = float3(0.0);

    o.x +=
        stepNoise(
            p.z * 0.05,
            5.0
        ) * 5.0;

    o.y +=
        stepNoise(
            p.z * 0.07,
            3.975
        ) * 5.0;

    return o;
}

float diam2(float2 p, float s) {

    p = abs(p);

    return
        (p.x + p.y - s)
        * inversesqrt(3.0);
}

float3 erot(
    float3 p,
    float3 ax,
    float t
) {
    return
        mix(
            dot(ax, p) * ax,
            p,
            cos(t)
        )
        +
        cross(ax, p) * sin(t);
}

half4 main(float2 fragCoord) {

    float2 uv =
        (fragCoord - 0.5 * iResolution.xy)
        / iResolution.y;

    float3 col = float3(0.0);

    // --------------------------------------------------------
    // Camera
    // --------------------------------------------------------

    float3 ro =
        float3(0.0, 0.0, -1.0);

    float3 rt =
        float3(0.0);

    ro.z += iTime * 5.0;
    rt.z += iTime * 5.0;

    ro += path(ro);
    rt += path(rt);

    float3 z =
        normalize(rt - ro);

    float3 x =
        float3(
            z.z,
            0.0,
            -z.x
        );

    float3 y =
        cross(z, x);

    // --------------------------------------------------------
    // Camera direction
    // --------------------------------------------------------

    float angle =
        stepNoise(
            iTime +
            hash(
                uv.x *
                uv.y *
                iTime
            ) * 0.05,
            6.0
        );

    float3 localDir =
        erot(
            normalize(
                float3(
                    uv.x,
                    uv.y,
                    1.0
                )
            ),
            float3(0.0, 0.0, 1.0),
            angle
        );

    // Equivalent to:
    //
    // mat3(x,cross(z,x),z) * localDir
    //
    float3 rd =
        x * localDir.x +
        y * localDir.y +
        z * localDir.z;

    float e = 0.0;
    float g = 0.0;

    // --------------------------------------------------------
    // Raymarch
    // --------------------------------------------------------

    for (int iter = 0; iter < 99; iter++) {

        float i =
            float(iter + 1);

        float3 p =
            ro + rd * g;

        p -= path(p);

        float r = 0.0;

        float3 pp = p;

        float sc = 1.0;

        // ----------------------------------------------------
        // Detail iterations
        // ----------------------------------------------------

        for (int jIter = 0; jIter < 4; jIter++) {

            float j =
                float(jIter + 1);

            float detail =
                abs(
                    dot(
                        sin(pp * 3.0),
                        cos(
                            float3(
                                pp.y,
                                pp.z,
                                pp.x
                            ) * 2.0
                        )
                    )
                    * 0.3
                    - 0.1
                )
                / sc;

            r =
                clamp(
                    r + detail,
                    -0.5,
                    0.5
                );

            pp =
                erot(
                    pp,
                    normalize(
                        float3(
                            0.1,
                            0.2,
                            0.3
                        )
                    ),
                    0.785 + j
                );

            pp +=
                float3(
                    pp.y,
                    pp.z,
                    pp.x
                )
                +
                j * 50.0;

            sc *= 1.5;
            pp *= 1.5;
        }

        // ----------------------------------------------------
        // Main tunnel distance
        // ----------------------------------------------------

        float h =
            abs(
                diam2(
                    p.xy,
                    7.0
                )
            )
            - 3.0
            - r;

        // ----------------------------------------------------
        // Rotated inner structure
        // ----------------------------------------------------

        p =
            erot(
                p,
                float3(
                    0.0,
                    0.0,
                    1.0
                ),
                path(p).x * 0.5
                +
                p.z * 0.2
            );

        float t =
            length(
                abs(p.xy)
                - 0.5
            )
            - 0.1;

        h = min(t, h);

        // ----------------------------------------------------
        // Preserve original:
        //
        // g += e =
        //   max(.001, t==h ? abs(h) : h);
        // ----------------------------------------------------

        float stepValue;

        if (t == h) {
            stepValue =
                max(
                    0.001,
                    abs(h)
                );
        } else {
            stepValue =
                max(
                    0.001,
                    h
                );
        }

        e = stepValue;
        g += e;

        // ----------------------------------------------------
        // Color accumulation
        // ----------------------------------------------------

        float3 contribution;

        if (t == h) {

            float glow =
                100.0 *
                exp(
                    -20.0 *
                    fract(
                        p.z * 0.25 +
                        iTime
                    )
                );

            float checker =
                mod(
                    floor(p.z * 4.0)
                    +
                    mod(
                        floor(p.y * 4.0),
                        2.0
                    ),
                    2.0
                );

            contribution =
                float3(
                    0.3,
                    0.2,
                    0.1
                )
                * glow
                * checker;

        } else {

            contribution =
                float3(0.1);
        }

        col +=
            contribution
            * 0.0325
            / exp(
                i * i * e
            );
    }

    // --------------------------------------------------------
    // Fog / distance blend
    // --------------------------------------------------------

    float fog =
        1.0 -
        exp(
            -0.01 *
            g * g * g
        );

    col =
        mix(
            col,
            float3(
                0.9,
                0.9,
                1.1
            ),
            fog
        );

    return half4(
        col,
        1.0
    );
}
`
    },
    {
        title: 'Light Speed',
        tag: 'Advanced',
        code: `// kind=shader
uniform float iTime;
uniform float2 iResolution;

// Inspired by "past racer" by jetlab

const int STEPS = 30;


// ============================================================
// 2D rotation
// ============================================================

float2 rot2(float2 p, float a) {
    float c = cos(a);
    float s = sin(a);

    return float2(
        c * p.x + s * p.y,
        -s * p.x + c * p.y
    );
}


// ============================================================
// Camera rotation
// ============================================================

void cam(inout float3 p, float t) {

    t *= 0.3;

    float2 xz =
        rot2(
            p.xz,
            sin(t) * 0.3
        );

    p.x = xz.x;
    p.z = xz.y;

    float2 xy =
        rot2(
            p.xy,
            sin(t * 0.7) * 0.4
        );

    p.x = xy.x;
    p.y = xy.y;
}


// ============================================================
// Hash
// ============================================================

float hash(float t) {
    return fract(
        sin(t * 788.874)
    );
}

float hash2(float2 uv) {

    return fract(
        dot(
            sin(
                uv * 425.215 +
                uv.yx * 714.388
            ),
            float2(522.877)
        )
    );
}

float2 hash22(float2 uv) {

    float2 v =
        sin(
            uv * 425.215 +
            uv.yx * 714.388
        )
        *
        float2(522.877);

    return fract(v);
}

float3 hash3(float2 id) {

    float3 a =
        id.xyy *
        float3(
            427.544,
            224.877,
            974.542
        );

    float3 b =
        id.yxx *
        float3(
            947.544,
            547.847,
            652.454
        );

    return fract(
        sin(a + b) *
        342.774
    );
}


// ============================================================
// Curves
// ============================================================

float curve(float t, float d) {

    t /= d;

    float ft =
        fract(t);

    float u =
        smoothstep(
            0.0,
            1.0,
            ft
        );

    // pow is scalar here, which is supported by your RuntimeEffect
    u =
        u * u * u * u * u *
        u * u * u * u * u;

    return mix(
        hash(floor(t)),
        hash(floor(t) + 1.0),
        u
    );
}

float tick(float t, float d) {

    t /= d;

    float m =
        fract(t);

    m =
        smoothstep(
            0.0,
            1.0,
            m
        );

    m =
        smoothstep(
            0.0,
            1.0,
            m
        );

    return (
        floor(t) +
        m
    ) * d;
}

float camtime(float t) {

    return
        t * 1.9 +
        tick(t, 1.9);
}


// ============================================================
// Main
// ============================================================

half4 main(float2 fragCoord) {

    float time =
        mod(
            iTime,
            300.0
        );

    // --------------------------------------------------------
    // Shadertoy -> Skia coordinate conversion
    // --------------------------------------------------------

    float2 uv =
        fragCoord /
        iResolution.xy;

    uv.y =
        1.0 -
        uv.y;

    uv -= 0.5;

    uv /=
        float2(
            iResolution.y /
            iResolution.x,
            1.0
        );

    float3 col =
        float3(0.0);

    float3 size =
        float3(
            0.9,
            0.9,
            1000.0
        );

    float dof =
        0.02;

    float dofdist =
        1.0 / 5.0;


    // ========================================================
    // Path tracing
    // ========================================================

    for (int jIndex = 0; jIndex < STEPS; jIndex++) {

        float j =
            float(jIndex);

        // ----------------------------------------------------
        // Depth-of-field offset
        // ----------------------------------------------------

        float2 off =
            hash22(
                uv +
                j * 74.542 +
                35.877
            ) * 2.0 - 1.0;

        // ----------------------------------------------------
        // Motion blur time
        // ----------------------------------------------------

        float t2 =
            camtime(
                time +
                j * 0.05 /
                float(STEPS)
            );

        // ----------------------------------------------------
        // Camera ray
        // ----------------------------------------------------

        float3 s =
            float3(
                0.0,
                0.0,
                -1.0
            );

        s.xy +=
            off * dof;

        float3 r =
            normalize(
                float3(
                    -uv -
                    off * dof * dofdist,
                    2.0
                )
            );

        cam(
            s,
            t2
        );

        cam(
            r,
            t2
        );

        float3 alpha =
            float3(1.0);


        // ====================================================
        // Bounces
        // ====================================================

        for (int bounceIndex = 0; bounceIndex < 3; bounceIndex++) {

            float i =
                float(bounceIndex);

            // ------------------------------------------------
            // Box collision
            // ------------------------------------------------

            float3 boxmin =
                (size - s) /
                r;

            float3 boxmax =
                (-size - s) /
                r;

            float3 boxv =
                max(
                    boxmin,
                    boxmax
                );

            // Only check X/Y
            float d =
                min(
                    boxv.x,
                    boxv.y
                );

            float3 p =
                s +
                r * d;

            float2 cuv =
                p.xz;

            float3 n =
                float3(
                    0.0,
                    sign(boxv.y),
                    0.0
                );

            if (boxv.x < boxv.y) {

                cuv =
                    p.yz;

                cuv.x += 1.0;

                n =
                    float3(
                        sign(boxv.x),
                        0.0,
                        0.0
                    );
            }

            // ------------------------------------------------
            // Animated coordinates
            // ------------------------------------------------

            float3 p2 =
                p;

            p2.z +=
                t2 * 3.0;

            cuv.y +=
                t2 * 3.0;

            cuv *= 3.0;

            float2 id =
                floor(cuv);

            float rough =
                min(
                    1.0,
                    0.85 +
                    0.2 *
                    hash2(
                        id +
                        100.5
                    )
                );


            // ------------------------------------------------
            // Surface color
            // ------------------------------------------------

            float3 addcol =
                float3(0.0);

            addcol +=
                float3(
                    1.0 +
                    max(
                        0.0,
                        cos(
                            cuv.y *
                            0.025
                        ) * 0.9
                    ),

                    0.5,

                    0.2 +
                    max(
                        0.0,
                        sin(
                            cuv.y *
                            0.05
                        ) * 0.5
                    )
                )
                *
                2.0;

            float curveValue =
                curve(
                    time +
                    id.y * 0.01 +
                    id.x * 0.03,
                    0.3
                );

            float mask =
                smoothstep(
                    0.5 *
                    curveValue,
                    0.0,
                    hash2(id)
                );

            addcol *=
                mask;

            float stripe =
                step(
                    0.5,
                    sin(p2.x) *
                    sin(p2.z * 0.4)
                );

            addcol *=
                stripe;

            float lowerGlow =
                max(
                    0.0,
                    curve(
                        time,
                        0.2
                    ) * 2.0 -
                    1.0
                );

            float randomMask =
                step(
                    hash2(id + 0.7),
                    0.2
                );

            addcol +=
                float3(
                    0.7,
                    0.5,
                    1.2
                )
                *
                step(
                    p2.y,
                    -0.9
                )
                *
                lowerGlow
                *
                randomMask;

            col +=
                addcol *
                alpha;


            // ------------------------------------------------
            // Fresnel
            // ------------------------------------------------

            float fre =
                pow(
                    max(
                        0.0,
                        1.0 -
                        dot(n, r)
                    ),
                    3.0
                );

            alpha *=
                fre * 0.9;


            // ------------------------------------------------
            // Reflection / diffuse bounce
            // ------------------------------------------------

            float3 pure =
                reflect(
                    r,
                    n
                );

            r =
                normalize(
                    hash3(
                        uv +
                        j * 74.524 +
                        i * 35.712
                    )
                    -
                    0.5
                );

            float dr =
                dot(r, n);

            if (dr < 0.0) {
                r = -r;
            }

            r =
                normalize(
                    mix(
                        r,
                        pure,
                        rough
                    )
                );

            s = p;
        }
    }


    // ========================================================
    // Final image
    // ========================================================

    col /=
        float(STEPS);

    col *= 2.0;

    col =
        smoothstep(
            0.0,
            1.0,
            col
        );

    // Original:
    // col = pow(col, vec3(0.4545));
    //
    // RuntimeEffect-compatible component-wise version.

    col =
        float3(
            pow(
                max(col.x, 0.0),
                0.4545
            ),

            pow(
                max(col.y, 0.0),
                0.4545
            ),

            pow(
                max(col.z, 0.0),
                0.4545
            )
        );

    return half4(
        col,
        1.0
    );
}
`
    },
    {
        title: 'Glass Cubes',
        tag: 'Advanced',
        code: `// kind=shader
uniform float iTime;
uniform float2 iResolution;


// ============================================================
// Cheap vec3 -> vec3 hash
// ============================================================

float3 hash33(float3 p) {

    float n =
        sin(
            dot(
                p,
                float3(
                    7.0,
                    157.0,
                    113.0
                )
            )
        );

    return fract(
        float3(
            2097152.0,
            262144.0,
            32768.0
        )
        *
        n
    );
}


// ============================================================
// Repeated cube field
// ============================================================

float map(float3 p) {

    // Cube center offset.
    float3 o =
        hash33(
            floor(p)
        )
        *
        0.2;

    // Repeat 3D space.
    p =
        fract(
            p + o
        )
        -
        0.5;

    // Slight convexity / roundness.
    float r =
        dot(p, p) -
        0.21;

    p =
        abs(p);

    return
        max(
            max(p.x, p.y),
            p.z
        )
        *
        0.95
        +
        r * 0.05
        -
        0.21;
}


// ============================================================
// Main
// ============================================================

half4 main(float2 fragCoord) {

    // --------------------------------------------------------
    // Screen coordinates
    // --------------------------------------------------------

    float2 uv =
        (
            fragCoord -
            iResolution.xy * 0.5
        )
        /
        iResolution.y;

    // --------------------------------------------------------
    // Fish-eye ray
    // --------------------------------------------------------

    float lens =
        (
            1.0 -
            dot(uv, uv) *
            0.5
        )
        *
        0.5;

    float3 rd =
        normalize(
            float3(
                uv,
                lens
            )
        );

    // --------------------------------------------------------
    // Ray origin
    // --------------------------------------------------------

    float3 ro =
        float3(
            0.0,
            0.0,
            iTime * 3.0
        );

    float3 col =
        float3(0.0);

    float3 sp =
        float3(0.0);


    // --------------------------------------------------------
    // Camera swivel
    //
    // Explicit 2D rotation replaces mat2.
    // --------------------------------------------------------

    float a =
        iTime * 0.375;

    float c =
        cos(a);

    float s =
        sin(a);

    float2 xz =
        rd.xz;

    rd.x =
        c * xz.x +
        s * xz.y;

    rd.z =
        -s * xz.x +
        c * xz.y;

    float2 xy =
        rd.xy;

    rd.x =
        c * xy.x +
        s * xy.y;

    rd.y =
        -s * xy.x +
        c * xy.y;


    // --------------------------------------------------------
    // Ray jitter
    // --------------------------------------------------------

    float3 jitter =
        hash33(rd);

    rd *=
        0.985 +
        jitter *
        0.03;


    // --------------------------------------------------------
    // Raymarch state
    // --------------------------------------------------------

    float t =
        0.0;

    float layers =
        0.0;

    float d =
        0.0;

    float aD =
        0.0;

    const float thD =
        0.035;


    // --------------------------------------------------------
    // Cube field raymarch
    // --------------------------------------------------------

    for (int i = 0; i < 56; i++) {

        // Early exits.
        if (
            layers > 15.0 ||
            col.x > 1.0 ||
            t > 10.0
        ) {
            break;
        }

        sp =
            ro +
            rd * t;

        d =
            map(sp);

        // Normalized distance from surface threshold.
        aD =
            (
                thD -
                abs(d) *
                15.0 /
                16.0
            )
            /
            thD;

        if (aD > 0.0) {

            // Smoothstep(aD)
            float smoothA =
                aD *
                aD *
                (
                    3.0 -
                    2.0 * aD
                );

            col +=
                smoothA
                /
                (
                    1.0 +
                    t * t *
                    0.25
                )
                *
                0.2;

            layers +=
                1.0;
        }

        t +=
            max(
                abs(d) * 0.7,
                thD * 1.5
            );
    }


    // --------------------------------------------------------
    // Prevent negative color
    // --------------------------------------------------------

    col =
        max(
            col,
            float3(0.0)
        );


    // ========================================================
    // Color treatment
    // ========================================================

    // Original:
    //
    // col = mix(
    //     col,
    //     pow(col.x*vec3(1.5,1,1), vec3(1,2.5,12)),
    //     ...
    // );
    //
    // Compute it component-wise for RuntimeEffect.

    float3 fireBase =
        col.x *
        float3(
            1.5,
            1.0,
            1.0
        );

    float3 fireCol =
        float3(
            pow(
                max(fireBase.x, 0.0),
                1.0
            ),

            pow(
                max(fireBase.y, 0.0),
                2.5
            ),

            pow(
                max(fireBase.z, 0.0),
                12.0
            )
        );

    float fireFactor =
        dot(
            sin(
                rd.yzx * 8.0 +
                sin(
                    rd.zxy * 8.0
                )
            ),
            float3(
                0.1666
            )
        )
        +
        0.4;

    col =
        mix(
            col,
            fireCol,
            fireFactor
        );


    // --------------------------------------------------------
    // Green coloration
    // --------------------------------------------------------

    float3 greenCol =
        float3(
            col.x * col.x * 0.85,
            col.x,
            col.x * col.x * 0.3
        );

    float greenFactor =
        dot(
            sin(
                rd.yzx * 4.0 +
                sin(
                    rd.zxy * 4.0
                )
            ),
            float3(
                0.1666
            )
        )
        +
        0.25;

    col =
        mix(
            col,
            greenCol,
            greenFactor
        );


    // --------------------------------------------------------
    // Output
    // --------------------------------------------------------

    return half4(
        max(
            col,
            float3(0.0)
        ),
        1.0
    );
}
`
    },
    {
        title: 'Night Drive',
        tag: 'Advanced',
        code: `// kind=shader
uniform float iTime;
uniform float2 iResolution;


// ============================================================
// Constants
// ============================================================

const float3 BACKGROUND_COLOR =
    float3(0.2, 0.4, 0.6) * 0.09;

const int MARCH_STEPS = 128;
const int MARCH_STEPS_REFLECTION = 48;

const float LIGHT_INTENSITY = 5.0;

const float PI =
    3.141592653589793238;


// ============================================================
// 2D rotation
// ============================================================

float2 rotate2(
    float2 p,
    float2 cs
) {
    return float2(
        cs.x * p.x - cs.y * p.y,
        cs.y * p.x + cs.x * p.y
    );
}


// ============================================================
// Noise
// ============================================================

float hash(float n) {
    return fract(
        sin(n) *
        687.3123
    );
}

float noise(float2 x) {

    float2 p =
        floor(x);

    float2 f =
        fract(x);

    f =
        f *
        f *
        (
            3.0 -
            2.0 * f
        );

    float n =
        p.x +
        p.y * 157.0;

    return mix(
        mix(
            hash(n),
            hash(n + 1.0),
            f.x
        ),
        mix(
            hash(n + 157.0),
            hash(n + 158.0),
            f.x
        ),
        f.y
    );
}

float fbm(float2 p) {

    float f = 0.0;

    f +=
        0.5000 *
        noise(p);

    p =
        rotate2(
            p,
            float2(
                0.80,
                0.60
            )
        )
        *
        2.02;

    f +=
        0.2500 *
        noise(p);

    p =
        rotate2(
            p,
            float2(
                0.80,
                0.60
            )
        )
        *
        2.03;

    f +=
        0.1250 *
        noise(p);

    return
        f / 0.9375;
}


// ============================================================
// Distance primitives
// ============================================================

float udRoundBox(
    float3 p,
    float3 b,
    float r
) {
    return
        length(
            max(
                abs(p) - b,
                float3(0.0)
            )
        )
        -
        r;
}

float sdBox(
    float3 p,
    float3 b
) {

    float3 d =
        abs(p) - b;

    return
        min(
            max(
                d.x,
                max(d.y, d.z)
            ),
            0.0
        )
        +
        length(
            max(
                d,
                float3(0.0)
            )
        );
}

float sdSphere(
    float3 p,
    float s
) {
    return length(p) - s;
}

float sdCylinder(
    float3 p,
    float2 h
) {

    float2 d =
        abs(
            float2(
                length(p.xz),
                p.y
            )
        )
        -
        h;

    return
        min(
            max(d.x, d.y),
            0.0
        )
        +
        length(
            max(
                d,
                float2(0.0)
            )
        );
}


// ============================================================
// Distance operators
// ============================================================

float opU(
    float d2,
    float d1
) {
    return min(d1, d2);
}

float opS(
    float d2,
    float d1
) {
    return max(-d1, d2);
}

float smin(
    float a,
    float b,
    float k
) {

    float mn =
        min(a, b);

    float mx =
        max(a, b);

    return
        mn -
        log(
            1.0 +
            exp(
                -k *
                (mx - mn)
            )
        )
        / k;
}


// ============================================================
// Car
// ============================================================

float mapCar(
    float3 p0
) {

    float3 p =
        p0 +
        float3(
            0.0,
            1.24,
            0.0
        );

    float r =
        length(p.yz);

    float d =
        length(
            max(
                float3(
                    abs(p.x) - 0.35,
                    r - 1.92,
                    -p.y + 1.4
                ),
                float3(0.0)
            )
        )
        -
        0.05;

    d =
        max(
            d,
            p.z - 1.0
        );

    p =
        p0 +
        float3(
            0.0,
            -0.22,
            0.39
        );

    p.xz =
        abs(p.xz) -
        float2(
            0.5300,
            0.9600
        );

    p.x =
        abs(p.x);

    r =
        length(p.yz);

    d =
        smin(
            d,
            length(
                max(
                    float3(
                        p.x - 0.08,
                        r - 0.25,
                        -p.y - 0.08
                    ),
                    float3(0.0)
                )
            )
            -
            0.04,
            8.0
        );

    d =
        max(
            d,
            -max(
                p.x - 0.165,
                r - 0.24
            )
        );

    float d2 =
        length(
            float2(
                max(
                    p.x - 0.13,
                    0.0
                ),
                r - 0.2
            )
        )
        -
        0.02;

    d =
        min(
            d,
            d2
        );

    return d;
}


// ============================================================
// Map result
// ============================================================

struct MapResult {
    float d;
    float lightDist;
};


// ============================================================
// Scene map
// ============================================================

MapResult mapScene(
    float3 p
) {

    float3 pd =
        p;

    float d = 0.0;

    pd.x =
        abs(pd.x);

    pd.z *=
        -sign(p.x);

    float time =
        iTime + 90.0;

    float ch =
        hash(
            floor(
                (pd.z + 18.0 * time) /
                40.0
            )
        );

    float lh =
        hash(
            floor(
                pd.z / 13.0
            )
        );

    float3 pdm =
        float3(
            pd.x,
            pd.y,
            mod(pd.z, 10.0) - 5.0
        );

    float dL =
        sdSphere(
            float3(
                pdm.x - 8.1,
                pdm.y - 4.5,
                pdm.z
            ),
            0.1
        );

    dL =
        opU(
            dL,
            sdBox(
                float3(
                    pdm.x - 12.0,
                    pdm.y - 9.5 - lh,
                    mod(pd.z, 91.0) - 45.5
                ),
                float3(
                    0.2,
                    4.5,
                    0.2
                )
            )
        );

    dL =
        opU(
            dL,
            sdBox(
                float3(
                    pdm.x - 12.0,
                    pdm.y - 11.5 + lh,
                    mod(pd.z, 31.0) - 15.5
                ),
                float3(
                    0.22,
                    5.5,
                    0.2
                )
            )
        );

    dL =
        opU(
            dL,
            sdBox(
                float3(
                    pdm.x - 12.0,
                    pdm.y - 8.5 - lh,
                    mod(pd.z, 41.0) - 20.5
                ),
                float3(
                    0.24,
                    3.5,
                    0.2
                )
            )
        );

    if (lh > 0.5) {

        dL =
            opU(
                dL,
                sdBox(
                    float3(
                        pdm.x - 12.5,
                        pdm.y - 2.75 - lh,
                        mod(pd.z, 13.0) - 6.5
                    ),
                    float3(
                        0.1,
                        0.25,
                        3.2
                    )
                )
            );
    }

    float3 pm =
        float3(
            mod(
                pd.x +
                floor(pd.z * 4.0) *
                0.25,
                0.5
            ) -
            0.25,

            pd.y,

            mod(pd.z, 0.25) -
            0.125
        );

    d =
        udRoundBox(
            pm,
            float3(
                0.245,
                0.1,
                0.12
            ),
            0.005
        );

    d =
        opS(
            d,
            -(p.x + 8.0)
        );

    d =
        opU(
            d,
            pd.y
        );

    float3 pdc =
        float3(
            pd.x,
            pd.y,
            mod(
                pd.z +
                18.0 * time,
                40.0
            ) -
            20.0
        );

    if (ch > 0.75) {

        pdc.x +=
            (ch - 0.75) *
            4.0;

        dL =
            opU(
                dL,
                sdSphere(
                    float3(
                        abs(pdc.x - 5.0) - 1.05,
                        pdc.y - 0.55,
                        pdc.z
                    ),
                    0.025
                )
            );

        dL =
            opU(
                dL,
                sdSphere(
                    float3(
                        abs(pdc.x - 5.0) - 1.2,
                        pdc.y - 0.65,
                        pdc.z + 6.05
                    ),
                    0.025
                )
            );

        d =
            opU(
                d,
                mapCar(
                    (
                        pdc -
                        float3(
                            5.0,
                            -0.025,
                            -2.3
                        )
                    )
                    *
                    0.45
                )
            );
    }

    d =
        opU(
            d,
            13.0 - pd.x
        );

    d =
        opU(
            d,
            sdCylinder(
                float3(
                    pdm.x - 8.5,
                    pdm.y,
                    pdm.z
                ),
                float2(
                    0.075,
                    4.5
                )
            )
        );

    d =
        opU(
            d,
            dL
        );

    MapResult result;

    result.d = d;
    result.lightDist = dL;

    return result;
}


// ============================================================
// Surface normal
// ============================================================

float3 calcNormalSimple(
    float3 pos
) {

    const float e = 0.005;

    float3 ex =
        float3(
            e,
            -e,
            -e
        );

    float3 n =
        ex.xyy *
        mapScene(
            pos + ex.xyy
        ).d
        +
        ex.yyx *
        mapScene(
            pos + ex.yyx
        ).d
        +
        ex.yxy *
        mapScene(
            pos + ex.yxy
        ).d
        +
        ex.xxx *
        mapScene(
            pos + ex.xxx
        ).d;

    return normalize(n);
}

float3 calcNormal(
    float3 pos
) {

    float3 n =
        calcNormalSimple(pos);

    if (pos.y > 0.12) {
        return n;
    }

    float2 oc =
        floor(
            float2(
                pos.x +
                floor(pos.z * 4.0) *
                0.25,
                pos.z
            )
            *
            float2(
                2.0,
                4.0
            )
        );

    if (abs(pos.x) < 8.0) {
        oc = pos.xz;
    }

    float3 pp =
        pos * 250.0;

    float3 xn =
        0.05 *
        float3(
            noise(pp.xz) - 0.5,
            0.0,
            noise(pp.zx) - 0.5
        );

    xn +=
        0.1 *
        float3(
            fbm(oc.xy) - 0.5,
            0.0,
            fbm(oc.yx) - 0.5
        );

    return normalize(
        xn + n
    );
}


// ============================================================
// Trace result
// ============================================================

struct TraceResult {
    float hit;
    float3 hit1;
    float3 hit2;
    float3 normal1;
    float4 light1;
    float4 light2;
};


// ============================================================
// Intersection
// ============================================================

TraceResult intersectScene(
    float3 ro,
    float3 rd
) {

    const float precis = 0.001;

    float h =
        precis * 2.0;

    float t = 0.0;

    float3 hit1 =
        float3(-500.0);

    float3 hit2 =
        float3(-500.0);

    float3 normal1 =
        float3(0.0);

    float4 light1 =
        float4(-500.0);

    float4 light2 =
        float4(-500.0);

    float minLight =
        100.0;

    for (
        int i = 0;
        i < MARCH_STEPS;
        i++
    ) {

        MapResult mr =
            mapScene(
                ro +
                rd * t
            );

        h = mr.d;

        if (
            mr.lightDist <
            minLight
        ) {

            minLight =
                mr.lightDist;

            light1.xyz =
                ro +
                rd * t;

            light1.w =
                abs(
                    mr.lightDist
                );
        }

        if (h < precis) {

            hit1 =
                ro +
                rd * t;

            break;
        }

        t +=
            max(
                h,
                precis * 2.0
            );
    }

    if (
        hit1.z < -400.0 ||
        t > 300.0
    ) {

        float planeT =
            -(
                ro.y + 0.1
            )
            /
            rd.y;

        if (planeT > 0.0) {

            hit1 =
                ro +
                rd *
                planeT;

        } else {

            TraceResult miss;

            miss.hit = -1.0;
            miss.hit1 = hit1;
            miss.hit2 = hit2;
            miss.normal1 = normal1;
            miss.light1 = light1;
            miss.light2 = light2;

            return miss;
        }
    }

    ro =
        ro +
        rd * t;

    normal1 =
        calcNormal(ro);

    ro +=
        0.01 *
        normal1;

    rd =
        reflect(
            rd,
            normal1
        );

    t = 0.0;
    h = precis * 2.0;
    minLight = 100.0;

    for (
        int i = 0;
        i < MARCH_STEPS_REFLECTION;
        i++
    ) {

        MapResult mr =
            mapScene(
                ro +
                rd * t
            );

        h = mr.d;

        if (
            mr.lightDist <
            minLight
        ) {

            minLight =
                mr.lightDist;

            light2.xyz =
                ro +
                rd * t;

            light2.w =
                abs(
                    mr.lightDist
                );
        }

        if (h < precis) {

            hit2 =
                ro +
                rd * t;

            break;
        }

        t +=
            max(
                h,
                precis * 2.0
            );
    }

    TraceResult result;

    result.hit =
        hit2.z > -400.0
        ? 1.0
        : 0.0;

    result.hit1 = hit1;
    result.hit2 = hit2;
    result.normal1 = normal1;
    result.light1 = light1;
    result.light2 = light2;

    return result;
}


// ============================================================
// Shading
// ============================================================

float3 shade(
    float3 ro,
    float3 pos,
    float3 nor
) {

    float3 col =
        float3(0.5);

    if (
        abs(pos.x) > 15.0 ||
        abs(pos.x) < 8.0
    ) {
        col =
            float3(0.02);
    }

    if (pos.y < 0.01) {

        float ax =
            abs(pos.x);

        if (ax < 0.1) {
            col =
                float3(0.9);
        }

        if (
            abs(ax - 7.4) <
            0.1
        ) {
            col =
                float3(0.9);
        }
    }

    float sh =
        clamp(
            dot(
                nor,
                normalize(
                    float3(
                        -0.3,
                        0.3,
                        -0.5
                    )
                )
            ),
            0.0,
            1.0
        );

    col *=
        sh *
        BACKGROUND_COLOR;

    if (
        abs(pos.x) > 12.9 &&
        pos.y > 9.0
    ) {

        float ha =
            hash(
                133.1234 *
                floor(pos.y / 3.0) +
                floor(pos.z / 3.0)
            );

        if (ha > 0.95) {

            col =
                (ha - 0.95) *
                10.0 *
                float3(
                    1.0,
                    0.7,
                    0.4
                );
        }
    }

    col =
        mix(
            BACKGROUND_COLOR,
            col,
            exp(
                min(
                    max(
                        0.1 * pos.y,
                        0.25
                    )
                    -
                    0.065 *
                    distance(
                        pos,
                        ro
                    ),
                    0.0
                )
            )
        );

    return col;
}


// ============================================================
// Light color
// ============================================================

float3 getLightColor(
    float3 pos
) {

    float3 lcol =
        float3(
            1.0,
            0.7,
            0.5
        );

    float3 pd =
        pos;

    pd.x =
        abs(pd.x);

    pd.z *=
        -sign(pos.x);

    float time =
        iTime + 90.0;

    float ch =
        hash(
            floor(
                (
                    pd.z +
                    18.0 * time
                )
                /
                40.0
            )
        );

    float3 pdc =
        float3(
            pd.x,
            pd.y,
            mod(
                pd.z +
                18.0 * time,
                40.0
            )
            -
            20.0
        );

    if (ch > 0.75) {

        pdc.x +=
            (ch - 0.75) *
            4.0;

        if (
            sdSphere(
                float3(
                    abs(
                        pdc.x - 5.0
                    )
                    -
                    1.05,
                    pdc.y - 0.55,
                    pdc.z
                ),
                0.25
            ) < 2.0
        ) {

            lcol =
                float3(
                    1.0,
                    0.05,
                    0.01
                );
        }
    }

    if (
        pd.y > 2.0 &&
        abs(pd.x) > 10.0 &&
        pd.y < 5.0
    ) {

        float fl =
            floor(
                pd.z / 13.0
            );

        lcol =
            0.4 * lcol +
            0.5 *
            float3(
                hash(0.1562 + fl),
                hash(0.423134 + fl),
                0.0
            );
    }

    if (
        abs(pd.x) > 10.0 &&
        pd.y > 5.0
    ) {

        float fl =
            floor(
                pd.z / 2.0
            );

        lcol =
            0.5 * lcol +
            0.5 *
            float3(
                hash(0.1562 + fl),
                hash(0.923134 + fl),
                hash(0.423134 + fl)
            );
    }

    return lcol;
}


// ============================================================
// Random start
// ============================================================

float randomStart(
    float2 co
) {

    return
        0.8 +
        0.2 *
        hash(
            dot(
                co,
                float2(
                    123.42,
                    117.853
                )
            )
            *
            412.453
        );
}


// ============================================================
// Main
// ============================================================

half4 main(
    float2 fragCoord
) {

    float2 q =
        fragCoord /
        iResolution.xy;

    float2 p =
        -1.0 +
        2.0 * q;

    p.x *=
        iResolution.x /
        iResolution.y;

    // IMPORTANT:
    // Skia Labs' fragCoord orientation is opposite to the
    // orientation expected by this Shadertoy shader.
    p.y = -p.y;


    // Cinematic bars
    if (
        q.y < 0.12 ||
        q.y >= 0.88
    ) {

        return half4(
            0.0,
            0.0,
            0.0,
            1.0
        );
    }


    // ========================================================
    // Camera
    // ========================================================

    float time =
        iTime + 90.0;

    float z =
        time;

    float x =
        -10.9 +
        sin(time * 0.2);

    float3 ro =
        float3(
            x,
            1.3 +
            0.3 *
            cos(time * 0.26),
            z - 1.0
        );

    float3 ta =
        float3(
            -8.0,
            1.3 +
            0.4 *
            cos(time * 0.26),
            z +
            4.0 +
            cos(time * 0.04)
        );

    float3 ww =
        normalize(
            ta - ro
        );

    float3 uu =
        normalize(
            cross(
                ww,
                float3(
                    0.0,
                    1.0,
                    0.0
                )
            )
        );

    float3 vv =
        normalize(
            cross(
                uu,
                ww
            )
        );

    float3 rd =
        normalize(
            -p.x * uu +
            p.y * vv +
            2.2 * ww
        );


    float3 col =
        BACKGROUND_COLOR;


    // ========================================================
    // Raymarch
    // ========================================================

    float start =
        randomStart(p);

    TraceResult trace =
        intersectScene(
            ro +
            start * rd,
            rd
        );

    float ints =
        trace.hit;


    if (ints > -0.5) {

        float r =
            0.09;

        if (
            trace.hit1.y >
            0.129
        ) {

            r =
                0.025 *
                hash(
                    133.1234 *
                    floor(
                        trace.hit1.y /
                        3.0
                    )
                    +
                    floor(
                        trace.hit1.z /
                        3.0
                    )
                );
        }

        if (
            abs(trace.hit1.x) <
            8.0
        ) {

            if (
                trace.hit1.y <
                0.01
            ) {

                r =
                    0.007 *
                    fbm(
                        trace.hit1.xz
                    );

            } else {

                r =
                    0.02;
            }
        }

        if (
            abs(trace.hit1.x) <
            0.1
        ) {
            r *= 4.0;
        }

        if (
            abs(
                abs(trace.hit1.x) -
                7.4
            ) <
            0.1
        ) {
            r *= 4.0;
        }

        r *= 2.0;

        col =
            shade(
                ro,
                trace.hit1,
                trace.normal1
            );

        if (ints > 0.5) {

            col +=
                r *
                shade(
                    trace.hit1,
                    trace.hit2,
                    calcNormalSimple(
                        trace.hit2
                    )
                );
        }

        if (
            trace.light2.w >
            0.0
        ) {

            col +=
                (
                    r *
                    LIGHT_INTENSITY *
                    exp(
                        -trace.light2.w *
                        7.0
                    )
                )
                *
                getLightColor(
                    trace.light2.xyz
                );
        }
    }


    // ========================================================
    // Rain
    // ========================================================

    float2 st =
        256.0 *
        (
            p *
            float2(
                0.5,
                0.01
            )
            +
            float2(
                time * 0.13 -
                q.y * 0.6,
                time * 0.13
            )
        );

    float rain =
        noise(st) *
        noise(st * 0.773) *
        1.55;

    rain =
        0.25 +
        clamp(
            pow(
                abs(rain),
                13.0
            )
            *
            13.0,
            0.0,
            q.y * 0.14
        );

    if (
        trace.light1.w >
        0.0
    ) {

        col +=
            (
                rain *
                LIGHT_INTENSITY *
                exp(
                    -trace.light1.w *
                    7.0
                )
            )
            *
            getLightColor(
                trace.light1.xyz
            );
    }

    col +=
        0.25 *
        rain *
        (
            0.2 +
            BACKGROUND_COLOR
        );


    // ========================================================
    // Post processing
    // ========================================================

    col =
        clamp(
            col,
            float3(0.0),
            float3(1.0)
        );

    col =
        float3(
            pow(col.x, 0.4545),
            pow(col.y, 0.4545),
            pow(col.z, 0.4545)
        );

    col *=
        1.2 *
        float3(
            1.0,
            0.99,
            0.95
        );

    col =
        clamp(
            1.06 * col -
            0.03,
            float3(0.0),
            float3(1.0)
        );

    float vignetteY =
        (
            q.y -
            0.12
        )
        /
        0.76;

    float vignette =
        0.5 +
        0.5 *
        pow(
            max(
                16.0 *
                q.x *
                vignetteY *
                (1.0 - q.x) *
                (1.0 - vignetteY),
                0.0
            ),
            0.1
        );

    col *=
        vignette;

    return half4(
        col,
        1.0
    );
}
`
    },
    {
        title: 'Keyboard Test',
        tag: 'Interactive',
        code: `// kind=shader

/* 
 * NOTE ON MOBILE (REACT NATIVE, FLUTTER, NATIVE) USAGE:
 * This specific shader uses a raw 256x3 byte array texture (iKeyboard)
 * updated continuously by global DOM keyboard events (window.addEventListener). 
 * 
 * It will NOT work "out-of-the-box" in mobile apps because:
 * 1. Mobile devices lack a global physical keyboard listener by default.
 * 2. Uploading a dynamic CPU byte array to a GPU Image texture 
 *    every single frame is highly inefficient on mobile UI frameworks.
 *
 * For mobile interactions, use touch gesture handlers (like GestureDetector)
 * to track touches and pass them to your shader as standard uniform floats!
 */

uniform float iTime;
uniform float2 iResolution;
uniform shader iKeyboard;

// Helper to check if a specific key is currently being held down
float keyHeld(float keycode) {
    // Row 0 is the "held down" state
    return iKeyboard.eval(float2(keycode + 0.5, 0.5)).r;
}

// Math to draw a rounded rectangle (a keyboard key)
float sdRoundRect(float2 p, float2 b, float r) {
    float2 d = abs(p) - b + float2(r);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
}

// Helper to get the correct keycode without using arrays
float getKeyCode(int row, int col) {
    if (row == 0) { // Top Row (Q to P)
        if (col == 0) return 81.0;
        if (col == 1) return 87.0;
        if (col == 2) return 69.0;
        if (col == 3) return 82.0;
        if (col == 4) return 84.0;
        if (col == 5) return 89.0;
        if (col == 6) return 85.0;
        if (col == 7) return 73.0;
        if (col == 8) return 79.0;
        if (col == 9) return 80.0;
    } else if (row == 1) { // Middle Row (A to L)
        if (col == 0) return 65.0;
        if (col == 1) return 83.0;
        if (col == 2) return 68.0;
        if (col == 3) return 70.0;
        if (col == 4) return 71.0;
        if (col == 5) return 72.0;
        if (col == 6) return 74.0;
        if (col == 7) return 75.0;
        if (col == 8) return 76.0;
    } else if (row == 2) { // Bottom Row (Z to M)
        if (col == 0) return 90.0;
        if (col == 1) return 88.0;
        if (col == 2) return 67.0;
        if (col == 3) return 86.0;
        if (col == 4) return 66.0;
        if (col == 5) return 78.0;
        if (col == 6) return 77.0;
    }
    return -1.0;
}

half4 main(float2 fragCoord) {
    // Normalize coordinates and center them
    float2 uv = fragCoord / iResolution.xy;
    float2 p = uv - float2(0.5);
    p.x *= iResolution.x / iResolution.y; // Correct aspect ratio
    
    float3 col = float3(0.1, 0.1, 0.15); // Dark background
    
    float2 boxSize = float2(0.035);
    float spacing = 0.09;
    float cornerRadius = 0.008;
    
    // 1. Draw Top Row (10 keys)
    for (int i = 0; i < 10; ++i) {
        float2 pos = float2(-4.5 * spacing + float(i) * spacing, -0.12);
        float dist = sdRoundRect(p - pos, boxSize, cornerRadius);
        if (dist < 0.0) {
            float state = keyHeld(getKeyCode(0, i));
            col = mix(float3(0.3), float3(0.1, 0.9, 0.2), state); 
        }
    }
    
    // 2. Draw Middle Row (9 keys)
    for (int i = 0; i < 9; ++i) {
        float2 pos = float2(-4.0 * spacing + float(i) * spacing, 0.0);
        float dist = sdRoundRect(p - pos, boxSize, cornerRadius);
        if (dist < 0.0) {
            float state = keyHeld(getKeyCode(1, i));
            col = mix(float3(0.3), float3(0.1, 0.9, 0.2), state);
        }
    }
    
    // 3. Draw Bottom Row (7 keys)
    for (int i = 0; i < 7; ++i) {
        float2 pos = float2(-3.0 * spacing + float(i) * spacing, 0.12);
        float dist = sdRoundRect(p - pos, boxSize, cornerRadius);
        if (dist < 0.0) {
            float state = keyHeld(getKeyCode(2, i));
            col = mix(float3(0.3), float3(0.1, 0.9, 0.2), state);
        }
    }

    // 4. Draw Arrow Keys (Inverted T shape - Shifted Right to avoid M)
    for (int i = 0; i < 4; ++i) {
        float keycode = 0.0;
        float2 pos = float2(0.0);
        
        if (i == 0)      { keycode = 38.0; pos = float2(5.0 * spacing, 0.12); } // Up
        else if (i == 1) { keycode = 37.0; pos = float2(4.0 * spacing, 0.24); } // Left
        else if (i == 2) { keycode = 40.0; pos = float2(5.0 * spacing, 0.24); } // Down
        else if (i == 3) { keycode = 39.0; pos = float2(6.0 * spacing, 0.24); } // Right
        
        float dist = sdRoundRect(p - pos, boxSize, cornerRadius);
        if (dist < 0.0) {
            float state = keyHeld(keycode);
            col = mix(float3(0.3), float3(0.1, 0.9, 0.2), state);
        }
    }
    
    return half4(col, 1.0);
}`
    }
];
