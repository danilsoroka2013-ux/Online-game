// camera.js
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export const cameraRotation = {
    yaw: 0,
    pitch: 0
};

export function initCameraRotation(canvas, isChatOpenCheck) {
    document.addEventListener('click', () => {
        if (!isChatOpenCheck()) canvas.requestPointerLock?.();
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === canvas && !isChatOpenCheck()) {
            cameraRotation.custom_yaw = (cameraRotation.custom_yaw || 0) - e.movementX * 0.0025;
            cameraRotation.pitch -= e.movementY * 0.0025;
            
            if (cameraRotation.pitch > Math.PI / 4) cameraRotation.pitch = Math.PI / 4;
            if (cameraRotation.pitch < -Math.PI / 6) cameraRotation.pitch = -Math.PI / 6;
            
            cameraRotation.yaw = cameraRotation.custom_yaw;
        }
    });
}

export function setInitialYaw(angle) {
    cameraRotation.yaw = angle;
    cameraRotation.custom_yaw = angle;
    cameraRotation.pitch = 0.1;
}

export function updateCameraPosition(camera, playerPosition) {
    // ВОТ ТУТ МЕНЯТЬ ПОЛОЖЕНИЕ КАМЕРЫ (X, Y, Z)
    const targetOffset = new THREE.Vector3(2.8, 3.9, 4);
    
    targetOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), cameraRotation.pitch);
    targetOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.yaw);
    
    camera.position.copy(playerPosition).add(targetOffset);
    
    // Смотрим строго в пространство перед игроком, чтобы не косить при ходьбе
    const lookTarget = playerPosition.clone().add(new THREE.Vector3(0, 1.5, 0));
    camera.lookAt(lookTarget);
}
