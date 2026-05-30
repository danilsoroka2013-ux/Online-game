// world.js - Генерация окружения и данные коллизий
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export const colliders = []; // Массив объектов { x, z, radius }

export function generateEnvironment(scene) {
    // 20 Деревьев. Радиус коллизии ствола ~0.6
    for (let i = 0; i < 20; i++) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.5, 4, 8),
            new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.9 })
        );
        trunk.position.y = 2; tree.add(trunk);
        const leaves = new THREE.Mesh(
            new THREE.SphereGeometry(1.8, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x2e6f40, roughness: 0.6 })
        );
        leaves.position.y = 4.5; tree.add(leaves);
        
        const pos = setRandomPosition(tree, 15, 120);
        scene.add(tree);
        colliders.push({ x: pos.x, z: pos.z, radius: 0.6 });
    }

    // 30 Камней. Радиус зависит от размера меша
    for (let i = 0; i < 30; i++) {
        const size = 0.5 + Math.random() * 1.2;
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(size),
            new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 })
        );
        rock.position.y = size * 0.5;
        rock.scale.set(1, 0.7 + Math.random()*0.5, 1);
        
        const pos = setRandomPosition(rock, 10, 130);
        scene.add(rock);
        colliders.push({ x: pos.x, z: pos.z, radius: size * 0.9 });
    }

    // Трава (без коллизий)
    for (let i = 0; i < 150; i++) {
        const grassGroup = new THREE.Group();
        const bladeMat = new THREE.MeshBasicMaterial({ color: 0x3d8c33 });
        for(let j = 0; j < 3; j++) {
            const blade = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 4), bladeMat);
            blade.position.set((Math.random()-0.5)*0.3, 0.3, (Math.random()-0.5)*0.3);
            blade.rotation.z = (Math.random() - 0.5) * 0.4;
            blade.rotation.x = (Math.random() - 0.5) * 0.4;
            grassGroup.add(blade);
        }
        setRandomPosition(grassGroup, 5, 140);
        scene.add(grassGroup);
    }
}

function setRandomPosition(object, minDist, maxDist) {
    const angle = Math.random() * Math.PI * 2;
    const radius = minDist + Math.random() * (maxDist - minDist);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    object.position.set(x, 0, z);
    return { x, z };
}

// Функция проверки коллизий (возвращает скорректированную позицию)
export function checkCollisions(currentPos, radius = 0.6) {
    let corrected = currentPos.clone();
    for (const col of colliders) {
        const dx = corrected.x - col.x;
        const dz = corrected.z - col.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = col.radius + radius;
        
        if (dist < minDist) {
            // Выталкиваем персонажа из объекта по вектору столкновения
            const overlap = minDist - dist;
            const nx = dx / (dist || 1);
            const nz = dz / (dist || 1);
            corrected.x += nx * overlap;
            corrected.z += nz * overlap;
        }
    }
    return corrected;
}
