// control.js - Модуль управления клавиатурой
export const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false
};

const keyMap = {
    'KeyW': 'forward', 'KeyA': 'left', 'KeyS': 'backward', 'KeyD': 'right',
    'KeyЦ': 'forward', 'KeyФ': 'left', 'KeyЫ': 'backward', 'KeyВ': 'right'
};

export function initControls(isChatOpenCheck) {
    document.addEventListener('keydown', (e) => {
        if (isChatOpenCheck() && e.code !== 'Enter') return;
        if (keyMap[e.code]) keys[keyMap[e.code]] = true;
    });

    document.addEventListener('keyup', (e) => {
        if (keyMap[e.code]) keys[keyMap[e.code]] = false;
    });
}

export function resetKeys() {
    keys.forward = false;
    keys.backward = false;
    keys.left = false;
    keys.right = false;
}
