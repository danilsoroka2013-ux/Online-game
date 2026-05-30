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

// Ссылка на комнату (сделаем одну статичную комнату "main_room")
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

    // Тело колобка
    const bodyGeo = new THREE.SphereGeometry(1, 32, 32);
    const bodyMat = new THREE.MeshStandardMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Глаза, чтобы видеть куда он катится
    const eyeGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.3, 0.3, 0.9); // Спереди сферы
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.3, 0.3, 0.9);

    group.add(leftEye, rightEye);
    return group;
}

// Подключение к Firebase и Лобби
initWorld();

// Генерируем уникальный ID для себя при входе
localPlayerId = 'player_' + Math.floor(Math.random() * 100000);

// При закрытии вкладки удаляем себя из базы
const playerRef = roomRef.child('players').child(localPlayerId);
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
    
    // Проверка на создателя (первый в списке становится хостом)
    const pIds = Object.keys(fbPlayers);
    if (pIds[0] === localPlayerId) {
        isHost = true;
        startBtn.disabled = pIds.length < 1; // Можно запустить даже одному для теста, макс 3
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

    // Если игра запущена хостом
    if (data.started && !gameStarted) {
        startGame();
    }

    // Синхронизация 3D объектов игроков на сцене
    for (let id in fbPlayers) {
        const pData = fbPlayers[id];
        if (!players[id]) {
            // Создаем нового колобка на сцене
            players[id] = createBallMesh(pData.color);
            scene.add(players[id]);
            // Создаем плавающий бабл чата для него
            createChatBubbleElement(id);
        }
        
        // Позиция
        players[id].position.set(pData.x, 1, pData.z);
        // Вращение (физика качения)
        players[id].rotation.set(pData.rotX, pData.rotY, pData.rotZ);

        // Обновление текста чата
        updateChatBubbleText(id, pData.msg, pData.msgTime);
    }

    // Удаляем ушедших игроков
    for (let id in players) {
        if (!fbPlayers[id]) {
            scene.remove(players[id]);
            delete players[id];
            document.getElementById('bubble-' + id)?.remove();
        }
    }
});

// Нажатие кнопки Старт хостом
startBtn.addEventListener('click', () => {
    if (isHost) roomRef.update({ started: true });
});

function startGame() {
    gameStarted = true;
    lobby.style.display = 'none';
    canvasContainer.style.display = 'block';
    document.getElementById('chat-container').style.display = 'flex';
    
    // Инициализируем камеру и управление
    initCamera(players[localPlayerId]);
    initControls(playerRef, players[localPlayerId]);
    
    animate();
}

// Игровой цикл
function animate() {
    requestAnimationFrame(animate);
    
    if (gameStarted) {
        updateControls();
        updateCamera();
        updateBubblePositions();
    }
    
    renderer.render(scene, camera);
}

// Функции для Баблов ЧАТА
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
    // Проверка на 30 секунд жизни сообщения
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
        
        // Проецируем 3D координаты игрока на 2D экран
        const p = players[id].position.clone();
        p.y += 1.5; // Смещение чуть выше головы колобка
        p.project(camera);
        
        const x = (p.x * .5 + .5) * window.innerWidth;
        const y = (-(p.y * .5) + .5) * window.innerHeight;
        
        b.style.left = `${x}px`;
        b.style.top = `${y}px`;
    }
}

// Раз в секунду обновляем таймер в чат-баблах
setInterval(() => {
    if(!gameStarted) return;
    roomRef.child('players').once('value', snapshot => {
        const fbPlayers = snapshot.val() || {};
        for(let id in fbPlayers){
            updateChatBubbleText(id, fbPlayers[id].msg, fbPlayers[id].msgTime);
        }
    });
}, 1000);
