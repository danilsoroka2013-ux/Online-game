// camera.js - Модуль камеры от 3-го лица (GTA V Style)
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export let cameraYaw = 0;
export let cameraPitch = 0;

export function initCameraRotation(canvas, isChatOpenCheck) {
    document.addEventListener('click', () => {
        if (!isChatOpenCheck()) canvas.requestPointerLock?.();
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === canvas && !isChatOpenCheck()) {
            cameraYaw -= e.movementX * 0.0025;
            cameraPitch -= e.movementY * 0.0025;
            
            if (cameraPitch > Math.PI / 4) cameraPitch = Math.PI / 4;
            if (cameraPitch < -Math.PI / 6) cameraPitch = -Math.PI / 6;
        }
    });
}

export function setInitialYaw(angle) {
    cameraYaw = angle;
    cameraPitch = 0.1;
}

export function updateCameraPosition(camera, playerPosition) {
    // НАСТРОЙКА: X = 1.8 (сильно справа), Y = 3.2 (высоко), Z = 3.5 (сзади)
    const targetOffset = new THREE.Vector3(1.8, 3.2, 3.5);
    
    targetOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), cameraPitch);
    targetOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
    
    camera.position.copy(playerPosition).add(targetOffset);
    
    const lookTarget = playerPosition.clone().add(new THREE.Vector3(0, 1.5, 0));
    camera.lookAt(lookTarget);
}
