// take.js - Механика захвата и броска игрока
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export let carryState = {
    isCarrying: false,   // Держу ли я кого-то
    isBeingCarried: false, // Держат ли меня
    targetId: null,       // ID второго игрока
    throwVelocity: null   // Вектор физики полета при броске
};

let fKeyPressTimeout = null;
let fKeyPressStartTime = 0;
const LONG_PRESS_MS = 400; // Время удержания F для броска

export function initTakeMechanic(db, roomId, playerId, getOtherPlayerId, getPlayerMesh, getOtherMesh, cameraYaw) {
    
    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyF' || e.code === 'KeyА') {
            if (fKeyPressTimeout) return;
            fKeyPressStartTime = Date.now();
            
            fKeyPressTimeout = setTimeout(() => {
                // Долгое нажатие -> СИЛЬНЫЙ БРОСОК
                if (carryState.isCarrying) {
                    performThrow(db, roomId, playerId, getOtherPlayerId(), cameraYaw, 25); 
                }
                fKeyPressTimeout = null;
            }, LONG_PRESS_MS);
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'KeyF' || e.code === 'KeyА') {
            if (fKeyPressTimeout) {
                // Отпустили раньше времени -> Короткое нажатие (Взять / Положить)
                clearTimeout(fKeyPressTimeout);
                fKeyPressTimeout = null;
                
                if (carryState.isCarrying) {
                    // Уже несем -> просто отпускаем под ноги
                    performThrow(db, roomId, playerId, getOtherPlayerId(), cameraYaw, 0);
                } else if (!carryState.isBeingCarried) {
                    // Пытаемся взять
                    attemptTake(db, roomId, playerId, getOtherPlayerId(), getPlayerMesh(), getOtherMesh());
                }
            }
        }
    });

    // Слушаем изменения статуса захвата из Firebase
    db.ref('rooms/' + roomId + '/state').on('value', (snap) => {
        if (!snap.exists()) return;
        const state = snap.val();
        
        if (state.carrier === playerId) {
            carryState.isCarrying = true;
            carryState.isBeingCarried = false;
            carryState.targetId = state.victim;
        } else if (state.carrier === getOtherPlayerId()) {
            carryState.isCarrying = false;
            carryState.isBeingCarried = true;
            carryState.targetId = state.carrier;
        } else {
            carryState.isCarrying = false;
            carryState.isBeingCarried = false;
            carryState.targetId = null;
        }
    });

    // Слушаем импульсы бросков
    db.ref('rooms/' + roomId + '/throw').on('value', (snap) => {
        if (!snap.exists()) return;
        const t = snap.val();
        if (t.victim === playerId && t.timestamp > (carryState.lastThrowTime || 0)) {
            carryState.lastThrowTime = t.timestamp;
            // Активируем локальную физику полета для жертвы
            carryState.throwVelocity = new THREE.Vector3(t.vx, t.vy, t.vz);
        }
    });
}

function attemptTake(db, roomId, playerId, otherId, myMesh, otherMesh) {
    if (!otherMesh || !myMesh) return;
    const dist = myMesh.position.distanceTo(otherMesh.position);
    
    if (dist < 3.5) { // Дистанция "вплотную"
        db.ref('rooms/' + roomId + '/state').set({
            carrier: playerId,
            victim: otherId
        });
    }
}

function performThrow(db, roomId, playerId, otherId, cameraYaw, force = 0) {
    const throwTime = Date.now();
    db.ref('rooms/' + roomId + '/state').set({ carrier: null, victim: null });

    if (force > 0) {
        // Расчет вектора броска вперед по направлению камеры
        const dir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
        db.ref('rooms/' + roomId + '/throw').set({
            victim: otherId,
            vx: dir.x * force * 0.8,
            vy: force * 0.5, // Импульс вверх
            vz: dir.z * force * 0.8,
            timestamp: throwTime
        });
    }
}

// Просчет физики полета брошенного игрока
export function updateThrowPhysics(playerMesh, checkCollisions) {
    if (!carryState.throwVelocity) return;

    playerMesh.position.add(carryState.throwVelocity);
    carryState.throwVelocity.y -= 0.015; // Гравитация

    // Коллизии во время полета
    const corrected = checkCollisions(playerMesh.position, 0.6);
    playerMesh.position.x = corrected.x;
    playerMesh.position.z = corrected.z;

    if (playerMesh.position.y <= 0) {
        playerMesh.position.y = 0;
        carryState.throwVelocity = null; // Приземлился
        playerMesh.rotation.z = 0;       // Вернули в вертикальное положение
    }
}
