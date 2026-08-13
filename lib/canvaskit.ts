import type { CanvasKit } from 'canvaskit-wasm';

let canvasKitPromise: Promise<CanvasKit> | null = null;

export function loadCanvasKit(): Promise<CanvasKit> {
  if (canvasKitPromise) {
    return canvasKitPromise;
  }

  canvasKitPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('CanvasKit can only be loaded in the browser'));
      return;
    }

    const globalWin = window as unknown as { CanvasKitLoaded?: CanvasKit };
    if (globalWin.CanvasKitLoaded) {
      resolve(globalWin.CanvasKitLoaded);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/canvaskit-wasm@latest/bin/canvaskit.js';
    script.onload = () => {
      (window as unknown as {
        CanvasKitInit?: (opts: { locateFile: (file: string) => string }) => Promise<CanvasKit>;
      }).CanvasKitInit?.({
        locateFile: (file: string) => 'https://unpkg.com/canvaskit-wasm@latest/bin/' + file
      })
      .then((ck: CanvasKit) => {
        (window as unknown as { CanvasKitLoaded?: CanvasKit }).CanvasKitLoaded = ck;
        resolve(ck);
      })
      .catch(reject);
    };
    script.onerror = () => {
      reject(new Error('Failed to load CanvasKit script'));
    };
    document.head.appendChild(script);
  });

  return canvasKitPromise;
}
