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
            
            // Ограничения углов, чтобы камера не падала под землю и не крутилась мертвой петлей
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
    // НАСТРОЙКА GTA 5: X = 1.3 (сильнее вправо), Y = 2.6 (прилично повыше), Z = 3.0 (комфортно сзади)
    const targetOffset = new THREE.Vector3(1.3, 2.6, 3.0);
    
    // Вращаем смещение вслед за мышкой
    targetOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), cameraPitch);
    targetOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
    
    // Ставим камеру на позицию относительно игрока
    camera.position.copy(playerPosition).add(targetOffset);
    
    // Камера смотрит в центр персонажа (на уровне груди)
    const lookTarget = playerPosition.clone().add(new THREE.Vector3(0, 1.5, 0));
    camera.lookAt(lookTarget);
}
