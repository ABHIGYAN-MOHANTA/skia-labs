// 256 keys, 3 rows (held, pressed, toggled), 4 bytes per pixel (RGBA)
export const keyboardTexture = new Uint8Array(256 * 3 * 4);
let initialized = false;

export function initKeyboard() {
    if (initialized || typeof window === 'undefined') return;
    initialized = true;

    window.addEventListener('keydown', (e) => {
        const keycode = e.keyCode;
        if (keycode >= 0 && keycode < 256) {
            // Row 0: Held (y=0)
            keyboardTexture[keycode * 4] = 255;
            
            // Row 1: Pressed (y=1) -> start index 256 * 4
            // Only trigger "pressed" if it wasn't already held down
            if (keyboardTexture[keycode * 4 + 1] === 0) { // Using Green channel of Row 0 as a flag if needed, wait, better to just check the red channel.
                // Wait, if it wasn't held down before this event:
                // Actually, the OS repeats keydown events. We should check if e.repeat is false.
                if (!e.repeat) {
                    keyboardTexture[(256 + keycode) * 4] = 255;
                    
                    // Row 2: Toggled (y=2) -> start index 512 * 4
                    keyboardTexture[(512 + keycode) * 4] = keyboardTexture[(512 + keycode) * 4] === 0 ? 255 : 0;
                }
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        const keycode = e.keyCode;
        if (keycode >= 0 && keycode < 256) {
            // Row 0: Released
            keyboardTexture[keycode * 4] = 0;
        }
    });

    // Clear the "just pressed" row (row 1) every frame
    function clearPressed() {
        for (let i = 0; i < 256; i++) {
            keyboardTexture[(256 + i) * 4] = 0;
        }
        requestAnimationFrame(clearPressed);
    }
    requestAnimationFrame(clearPressed);
}
