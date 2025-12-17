export type ShaderExample = {
  title: string;
  code: string;
};

export const shaderExamples: ShaderExample[] = [
  {
    title: 'Color Waves',
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
    title: 'Tech Tunnel',
    code: `// kind=shader
uniform float iTime;
uniform float2 iResolution;

// Helpers
float3 P(float z) {
    float2 c = float2(cos(z * 0.1), cos(z * 0.12)) * 12.0;
    return float3(c.x, c.y, z);
}

float A(float F, float H, float K, float3 p) {
    return abs(dot(sin(p * (F * K)), float3(H))) / K;
}

// SKSL does not allow arrays → emulate with functions
float getScale(int idx) {
    if (idx == 0) return 0.6;
    if (idx == 1) return 1.0;
    if (idx == 2) return 1.8;
    if (idx == 3) return 3.2;
    return 6.0;
}

float getOffset(int idx) {
    if (idx == 0) return 0.6;
    if (idx == 1) return 0.2;
    if (idx == 2) return -0.05;
    if (idx == 3) return -0.35;
    return -0.7;
}

half4 main(float2 fragCoord) {
    float2 r = iResolution;
    float2 u = (fragCoord - r * 0.5) / r.y;

    // cinematic bars
    if (abs(u.y) > 0.375) return half4(0.0);

    float time = iTime;
    float T = time * 4.0 + 5.0 + 5.0 * sin(time * 0.3);

    float3 p = P(T);
    float3 Z = normalize(P(T + 4.0) - p);
    float3 X = normalize(float3(Z.z, 0.0, -Z.x));

    float3 bx = -X;
    float3 by = normalize(cross(X, Z));
    float3 bz = Z;

    float3 D = u.x * bx + u.y * by + 1.0 * bz;

    float3 colAccum = float3(0.0);

    float d = 0.0;
    float s = 0.0;
    float e = 0.0;
    float t = 0.0;

    // FOR LOOP (SKSL-compatible)
    for (int iter = 0; iter < 28; iter++) {

        if (d >= 30.0) break;

        p += D * s;

        float3 path = P(p.z);
        t = sin(time);

        float3 orb = float3(
            path.x + t,
            path.y + t * 2.0,
            6.0 + T + t * 2.0
        );

        e = length(p - orb) - 0.01;

        float r1 = length(p.xy - float2(path.x + 6.0, 0.0));
        float r2 = length((p - path).xy);

        float baseTunnel = cos(p.z * 0.6) * 2.0 + 4.0 - min(r1, r2);
        float noiseLarge = A(4.0, 0.25, 0.1, p);
        float noiseDetail = A(T + 8.0, 0.22, 2.0, p);

        float sCandidate = baseTunnel + noiseLarge + noiseDetail;

        float stepVal = min(e, 0.01 + 0.3 * abs(sCandidate));
        d += stepVal;
        s = stepVal;

        float safe = max(s, 1e-6);

        colAccum += 1.0 / safe + float3(10.0, 20.0, 50.0) / max(e, 0.6);
    }

    float3 col = (colAccum * colAccum) / 1e6;
    return half4(col, 1.0);
}
`
  },
  {
    title: 'Desert Dunes',
    code: `// kind=shader
uniform float iTime;
uniform float2 iResolution;

// --- utils ---
float2 rot(float2 p, float a) {
    float c = cos(a), s = sin(a);
    return float2(p.x*c - p.y*s, p.x*s + p.y*c);
}

float hash21(float2 p) {
    return fract(sin(dot(p, float2(127.1,311.7))) * 43758.5453);
}

float noise(float2 p) {
    float2 i = floor(p);
    float2 f = fract(p);
    f = f*f*(3.0 - 2.0*f);
    float a = hash21(i);
    float b = hash21(i + float2(1.0,0.0));
    float c = hash21(i + float2(0.0,1.0));
    float d = hash21(i + float2(1.0,1.0));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

float fbm(float2 p) {
    float v = 0.0;
    float amp = 0.55;
    p *= 0.8;
    for (int i = 0; i < 5; i++) {
        v += noise(p) * amp;
        p *= 2.0;
        amp *= 0.5;
    }
    return v;
}

float ridge(float2 p) {
    float v = fbm(p * 2.0);
    v += fbm(p * 5.7) * 0.5;
    return 1.0 - abs(2.0 * fract(v) - 1.0);
}

float haze(float dist, float height) {
    float f = exp(-dist * 0.12) * smoothstep(-1.2, 0.8, height);
    return clamp(1.0 - f, 0.0, 1.0);
}

// --- main ---
half4 main(float2 fragCoord) {

    float2 uv = fragCoord / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;

    float2 p = uv*2.0 - 1.0;
    p.x *= aspect;

    float t = iTime * 0.06;

    // === BRIGHT SKY ===
    float3 skyTop = float3(0.22,0.42,0.75);   // brighter blue
    float3 skyMid = float3(1.00,0.76,0.45);   // bright peach
    float skyBlend = smoothstep(1.0,-0.2,p.y);
    float3 col = mix(skyTop, skyMid, skyBlend) * 1.25;  // boosted brightness

    // === STRONGER SUN ===
    float2 sunPos = float2(0.45,-0.15);
    sunPos.x *= aspect;
    float2 sunUV = p - sunPos;
    float sunDist = length(sunUV);
    float sunGlow = exp(-sunDist * 5.0);
    col += float3(1.6,1.35,1.1) * sunGlow;   // brighter sun

    // === SOFT HOT RAYS ===
    float ray = max(0.0, 0.35 - abs(sunUV.y)*0.3);
    col += float3(1.3,1.1,0.8) * ray * 0.12;

    // === DUNE LAYERS (brightened) ===
    const int LAYERS = 5;

    float scales[5];
    scales[0]=0.6; scales[1]=1.0; scales[2]=1.8; scales[3]=3.2; scales[4]=6.0;

    float offsets[5];
    offsets[0]=0.4; offsets[1]=0.05; offsets[2]=-0.1; offsets[3]=-0.45; offsets[4]=-0.8;

    float speeds[5];
    speeds[0]=0.02; speeds[1]=0.06; speeds[2]=0.12; speeds[3]=0.22; speeds[4]=0.35;

    float amps[5];
    amps[0]=0.20; amps[1]=0.42; amps[2]=0.70; amps[3]=0.95; amps[4]=1.45;

    float3 dunes = float3(0.0);
    float totalDepth = 0.0;

    for (int i = 0; i < LAYERS; i++) {
        float s = scales[i];
        float yOff = offsets[i];
        float sp = speeds[i];
        float amp = amps[i];

        float2 coord = (p + float2(t*sp*(0.5+float(i)*0.12),0.0)) * float2(s, s*0.6);
        coord = rot(coord, 0.12 * float(i));

        float base = fbm(coord * 0.8) * 0.8;
        float ridg = ridge(coord * 4.0) * 0.18;
        float height = yOff + base * amp + ridg;

        float mask = smoothstep(height - 0.12, height + 0.08, -p.y);

        float depth = float(i)/float(LAYERS-1);
        float fog = mix(1.0,0.35,depth);

        float3 sandBase = float3(1.10,0.92,0.67);   // brighter sand
        float3 sandShade = float3(0.55,0.42,0.28);  // lighter shadows

        float lit = 0.35 + 0.65 * clamp(dot(normalize(float3(0.0,1.0,0.1)), 
                                        normalize(float3(sunPos.xy,-0.8))),
                                        0.0, 1.0);

        float3 layerColor = mix(sandShade, sandBase, lit);

        float crest = smoothstep(0.02,0.18,ridg);
        layerColor += crest * float3(1.2,1.0,0.75) * 0.18;

        dunes += layerColor * mask * fog;
        totalDepth += mask * fog;
    }

    if (totalDepth > 0.0) dunes /= totalDepth;

    // bright horizon blend
    float horizonFog = smoothstep(-0.4,0.3,p.y);
    float duneMix = clamp(1.0 - horizonFog*0.05, 0.0, 1.0);

    float3 scene = mix(col, dunes, duneMix);

    // add subtle sparkle
    float2 glintUV = p * float2(12.0,6.0) + float2(t*0.8,0.0);
    float g = fbm(glintUV)*0.5 + ridge(glintUV*3.0)*0.35;
    scene += float3(1.0,0.9,0.7) * pow(clamp(g,0.0,1.0), 3.0) * 0.08;

    // gentle tone mapping (brighter)
    scene = pow(scene, float3(0.85));

    // reduce vignette darkness drastically
    float vign = smoothstep(1.45, 0.55, length(p));
    scene *= (0.85 + 0.15 * vign);

    // tiny grain
    float grain = (hash21(fragCoord.xy*0.5)-0.5)*0.02;
    scene += grain;

    return half4(clamp(scene,0.0,1.0), 1.0);
}`
  }
];
