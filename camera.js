let targetMesh = null;
// Смещение камеры относительно колобка
const cameraOffset = new THREE.Vector3(0, 4, 7); 

function initCamera(playerMesh) {
    targetMesh = playerMesh;
    
    // Инициализируем камеру Three.js
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    updateCamera();
}

function updateCamera() {
    if (!targetMesh) return;

    // Рассчитываем идеальную позицию камеры сзади игрока
    const idealPosition = targetMesh.position.clone().add(cameraOffset);
    
    // Плавное следование камеры (Lerp)
    camera.position.lerp(idealPosition, 0.1);
    
    // Камера всегда смотрит на колобка
    camera.lookAt(targetMesh.position);
}
