// take.js
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export let carryState = {
    isCarrying: false,
    isBeingCarried: false,
    targetId: null,
    throwVelocity: null,
    lastThrowTime: 0
};

let fKeyPressTimeout = null;
let fKeyPressStartTime = 0;
const LONG_PRESS_MS = 400;

export function initTakeMechanic(db, roomIdGetter, playerId, otherIdGetter, getPlayerMesh, getOtherMesh, cameraRotationRef) {
    
    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyF' || e.code === 'KeyА') {
            const roomId = roomIdGetter();
            if (!roomId || fKeyPressTimeout) return;
            fKeyPressStartTime = Date.now();
            
            fKeyPressTimeout = setTimeout(() => {
                if (carryState.isCarrying) {
                    performThrow(db, roomId, playerId, otherIdGetter(), cameraRotationRef.yaw, 0.6); 
                }
                fKeyPressTimeout = null;
            }, LONG_PRESS_MS);
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'KeyF' || e.code === 'KeyА') {
            const roomId = roomIdGetter();
            if (!roomId) return;

            if (fKeyPressTimeout) {
                clearTimeout(fKeyPressTimeout);
                fKeyPressTimeout = null;
                
                if (carryState.isCarrying) {
                    performThrow(db, roomId, playerId, otherIdGetter(), cameraRotationRef.yaw, 0);
                } else if (!carryState.isBeingCarried) {
                    attemptTake(db, roomId, playerId, otherIdGetter(), getPlayerMesh(), getOtherMesh());
                }
            }
        }
    });

    // Динамическое обновление состояния комнат
    setInterval(() => {
        const roomId = roomIdGetter();
        if (!roomId) return;

        db.ref('rooms/' + roomId + '/state').once('value').then((snap) => {
            if (!snap.exists()) {
                carryState.isCarrying = false;
                carryState.isBeingCarried = false;
                carryState.targetId = null;
                return;
            }
            const state = snap.val();
            if (state.carrier === playerId) {
                carryState.isCarrying = true;
                carryState.isBeingCarried = false;
                carryState.targetId = state.victim;
            } else if (state.carrier === otherIdGetter()) {
                carryState.isCarrying = false;
                carryState.isBeingCarried = true;
                carryState.targetId = state.carrier;
            } else {
                carryState.isCarrying = false;
                carryState.isBeingCarried = false;
                carryState.targetId = null;
            }
        });

        db.ref('rooms/' + roomId + '/throw').once('value').then((snap) => {
            if (!snap.exists()) return;
            const t = snap.val();
            if (t.victim === playerId && t.timestamp > carryState.lastThrowTime) {
                carryState.lastThrowTime = t.timestamp;
                carryState.throwVelocity = new THREE.Vector3(t.vx, t.vy, t.vz);
                db.ref('rooms/' + roomId + '/throw').remove(); // Очищаем импульс
            }
        });
    }, 100);
}

function attemptTake(db, roomId, playerId, otherId, myMesh, otherMesh) {
    if (!otherMesh || !myMesh || !otherId) return;
    const dist = myMesh.position.distanceTo(otherMesh.position);
    
    if (dist < 4.0) { 
        db.ref('rooms/' + roomId + '/state').set({
            carrier: playerId,
            victim: otherId
        });
    }
}

function performThrow(db, roomId, playerId, otherId, yaw, force = 0) {
    db.ref('rooms/' + roomId + '/state').remove();

    if (force > 0 && otherId) {
        const dir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        db.ref('rooms/' + roomId + '/throw').set({
            victim: otherId,
            vx: dir.x * force,
            vy: 0.3, 
            vz: dir.z * force,
            timestamp: Date.now()
        });
    }
}

export function updateThrowPhysics(playerMesh, checkCollisions) {
    if (!carryState.throwVelocity) return;

    playerMesh.position.add(carryState.throwVelocity);
    carryState.throwVelocity.y -= 0.015; 

    const corrected = checkCollisions(playerMesh.position, 0.6);
    playerMesh.position.x = corrected.x;
    playerMesh.position.z = corrected.z;

    if (playerMesh.position.y <= 0) {
        playerMesh.position.y = 0;
        carryState.throwVelocity = null;
        playerMesh.rotation.z = 0; 
    }
}
