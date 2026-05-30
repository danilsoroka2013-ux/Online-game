const lobby = document.getElementById('lobby');
const startBtn = document.getElementById('start-btn');
const playerCountEl = document.getElementById('player-count');
const playersListEl = document.getElementById('players-list');
const canvasContainer = document.getElementById('canvas-container');

let scene, camera, renderer;
let localPlayerId = null;
let isHost = false;
let players = {}; // Хранилище 3D объектов игроков
let gameStarted = false;

// Ссылка на комнату
const roomRef = db.ref('rooms/main_room');

// Инициализация Three.js сцены
function initWorld() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    // Свет
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Маленький зеленый газон
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x348c31 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    canvasContainer.appendChild(renderer.domElement);

    window.addEventListener('resize', () => {
        if(camera) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        }
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Функция создания 3D модели Колобка (Сфера + Глаза)
function createBallMesh(color) {
    const group = new THREE.Group();

    const bodyGeo = new THREE.SphereGeometry(1, 32, 32);
    const bodyMat = new THREE.MeshStandardMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    const eyeGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.3, 0.3, 0.9);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.3, 0.3, 0.9);

    group.add(leftEye, rightEye);
    return group;
}

initWorld();

// Генерируем уникальный ID для себя
localPlayerId = 'player_' + Math.floor(Math.random() * 100000);

const playerRef = roomRef.child('players').child(localPlayerId);

// Важно: при выходе удаляем себя из базы
playerRef.onDisconnect().remove();

// Записываем свои начальные данные
playerRef.set({
    id: localPlayerId,
    color: '#' + Math.floor(Math.random()*16777215).toString(16),
    x: (Math.random() - 0.5) * 5,
    z: (Math.random() - 0.5) * 5,
    rotX: 0, rotY: 0, rotZ: 0,
    msg: "",
    msgTime: 0
});

// Слушаем изменения в комнате
roomRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    const fbPlayers = data.players || {};
    const pIds = Object.keys(fbPlayers);

    // Умный сброс комнаты: если игроков 0, выключаем статус "started"
    if (pIds.length === 0 && data.started) {
        roomRef.child('started').set(false);
        return;
    }

    // Проверка на создателя (первый в списке)
    if (pIds[0] === localPlayerId) {
        isHost = true;
        startBtn.disabled = false; 
    } else {
        isHost = false;
        startBtn.disabled = true;
    }

    // Лимит 3 игрока
    if (pIds.length > 3 && !pIds.includes(localPlayerId)) {
        alert("Комната заполнена!");
        playerRef.remove();
        window.location.reload();
        return;
    }

    // Обновляем UI лобби
    playerCountEl.innerText = `Игроков в сети: ${pIds.length} / 3`;
    playersListEl.innerHTML = pIds.map(id => `<div>${id === localPlayerId ? '<b>Вы</b>' : id} ${pIds[0] === id ? '(Создатель)' : ''}</div>`).join('');

    // Если игра запущена в базе, а у нас ещё нет — запускаем локально
    if (data.started && !gameStarted && fbPlayers[localPlayerId]) {
        startGame();
    }
    // Если в базе игра сброшена, а мы всё ещё в игре — возвращаем в лобби
    if (!data.started && gameStarted) {
        window.location.reload();
    }

    // Синхронизация 3D объектов игроков
    for (let id in fbPlayers) {
        const pData = fbPlayers[id];
        if (!players[id]) {
            players[id] = createBallMesh(pData.color);
            scene.add(players[id]);
            createChatBubbleElement(id);
        }
        
        players[id].position.set(pData.x, 1, pData.z);
        players[id].rotation.set(pData.rotX, pData.rotY, pData.rotZ);

        updateChatBubbleText(id, pData.msg, pData.msgTime);
    }

    // Удаляем ушедших
    for (let id in players) {
        if (!fbPlayers[id]) {
            scene.remove(players[id]);
            delete players[id];
            document.getElementById('bubble-' + id)?.remove();
        }
    }
});

// Нажатие кнопки Старт
startBtn.addEventListener('click', () => {
    if (isHost) roomRef.update({ started: true });
});

function startGame() {
    gameStarted = true;
    lobby.style.display = 'none';
    canvasContainer.style.display = 'block';
    document.getElementById('chat-container').style.display = 'flex';
    
    initCamera(players[localPlayerId]);
    initControls(playerRef, players[localPlayerId]);
    
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    if (gameStarted) {
        updateControls();
        updateCamera();
        updateBubblePositions();
    }
    renderer.render(scene, camera);
}

// ЧАТ БАБЛЫ
const bubblesContainer = document.createElement('div');
document.body.appendChild(bubblesContainer);

function createChatBubbleElement(id) {
    if (document.getElementById('bubble-' + id)) return;
    const b = document.createElement('div');
    b.id = 'bubble-' + id;
    b.className = 'chat-bubble';
    b.style.opacity = '0';
    bubblesContainer.appendChild(b);
}

function updateChatBubbleText(id, msg, timestamp) {
    const b = document.getElementById('bubble-' + id);
    if (!b) return;
    
    const now = Date.now();
    if (msg && (now - timestamp < 30000)) {
        const timeLeft = Math.ceil((30000 - (now - timestamp)) / 1000);
        b.innerText = `${msg} (${timeLeft}с)`;
        b.style.opacity = '1';
    } else {
        b.style.opacity = '0';
    }
}

function updateBubblePositions() {
    for (let id in players) {
        const b = document.getElementById('bubble-' + id);
        if (!b || b.style.opacity === '0') continue;
        
        const p = players[id].position.clone();
        p.y += 1.5;
        p.project(camera);
        
        const x = (p.x * .5 + .5) * window.innerWidth;
        const y = (-(p.y * .5) + .5) * window.innerHeight;
        
        b.style.left = `${x}px`;
        b.style.top = `${y}px`;
    }
}

setInterval(() => {
    if(!gameStarted) return;
    roomRef.child('players').once('value', snapshot => {
        const fbPlayers = snapshot.val() || {};
        for(let id in fbPlayers){
            updateChatBubbleText(id, fbPlayers[id].msg, fbPlayers[id].msgTime);
        }
    });
}, 1000);
