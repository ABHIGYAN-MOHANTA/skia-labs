# 🌌 **Skia Labs — SKSL Shader Playground**

A beautiful, fast, web-based playground for **Skia’s Shader Language (SKSL)**.
Write, preview, and share shaders — all rendered with **CanvasKit (Skia WebAssembly)** and powered by **Next.js** + **Monaco Editor**.

Skia Labs makes shader experimentation feel *creative, smooth, and joyful*. ✨

## ✨ **Features**

### 🎨 Real-time SKSL Shader Preview

* Powered by **CanvasKit WASM** for native Skia rendering.
* Instant hot-reload as you type.
* Supports animated uniforms (`iTime`, `iResolution`).

### 🧠 Monaco Editor with SKSL Language Support

* Custom syntax highlighting
* Auto-closing brackets & pairs
* Dark theme
* Smooth typing performance

### 🔀 Split-View Shader Editor

* Drag-resize editor & preview
* Fully responsive
* Snap-safe (min widths enforced)

### 🔗 One-Click Sharing

* Encodes shaders into URL for instant share links
* Copy shader code easily
* No backend required

### 🗂️ Gallery of Example Shaders

* Prebuilt examples
* Launch directly into editor
* Great for learning SKSL

### 💻 Powered by Modern Tech

* **Next.js (App Router)**
* **CanvasKit (Skia)**
* **Monaco Editor**
* **TypeScript**
* **Tailwind CSS**



## 🏗️ **Tech Stack**

| Layer            | Technology                                    |
| ---------------- | --------------------------------------------- |
| Frontend         | Next.js, React, Tailwind CSS                  |
| Shader Rendering | CanvasKit / Skia WASM                         |
| Code Editing     | Monaco Editor w/ custom SKSL language         |
| State & Utils    | React hooks, custom debounce & resizing logic |



## 📦 **Installation & Setup**

Clone the repo:

```sh
git clone https://github.com/ABHIGYAN-MOHANTA/skia-labs
cd skia-labs
```

Install dependencies:

```sh
npm install
# or
pnpm install
```

Run the dev server:

```sh
npm run dev
```

Visit:

```
http://localhost:3000
```



## 🧩 **Project Structure**

```
/app
  /editor       → The full shader editor page
  /components   → Shared UI components and shader logic
  /gallery      → Shader examples
/public         → Static assets (screenshots, icons)
```



## 🎛️ **Supported Uniforms**

Skia Labs automatically provides:

| Uniform       | Type     | Description             |
| ------------- | -------- | ----------------------- |
| `iTime`       | `float`  | Elapsed time in seconds |
| `iResolution` | `float2` | Canvas width & height   |



## 🗜️ **How Shaders Run (Under the Hood)**

Each shader is compiled using:

```ts
canvasKit.RuntimeEffect.Make(shaderCode)
```

Then executed every frame:

```ts
effect.makeShader(uniforms)
skCanvas.drawPaint(paint)
surface.flush()
```

A clean render loop ensures:

* smooth animation
* proper cleanup
* no WASM memory leaks



## 🤝 **Contributing**

Contributions are welcome!

### To add a new shader example:

1. Open `shaderExamples` array in `Home.tsx`
2. Add:

```ts
{
  title: 'My Cool Shader',
  code: `// kind=shader ...`
}
```

3. Submit a PR 🚀


## 🐛 **Reporting Bugs**

Open an issue here:

👉 [https://github.com/ABHIGYAN-MOHANTA/skia-labs/issues](https://github.com/ABHIGYAN-MOHANTA/skia-labs/issues)

Please include:

* browser & OS
* steps to reproduce
* shader code (if relevant)



## 📄 **License**

MIT License — free to use, modify, and build upon.


## ⭐ **Support the Project**

If you like this project, consider starring the repo:

👉 [https://github.com/ABHIGYAN-MOHANTA/skia-labs](https://github.com/ABHIGYAN-MOHANTA/skia-labs) ⭐


## **Made with passion for shaders and graphics.**