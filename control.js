let keys = { w: false, a: false, s: false, d: false };
let myFirebaseRef = null;
let myMesh = null;
let chatInput = document.getElementById('chat-input');
let isChatActive = false;

// Физические переменные для качения
let moveSpeed = 0.15;
let ballRadius = 1;

function initControls(playerRef, mesh) {
    myFirebaseRef = playerRef;
    myMesh = mesh;

    // Слушаем клавиатуру
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            toggleChat();
            return;
        }

        if (isChatActive) return; // Если пишем в чат, ходить нельзя

        if (e.key === 'w' || e.key === 'ArrowUp') keys.w = true;
        if (e.key === 's' || e.key === 'ArrowDown') keys.s = true;
        if (e.key === 'a' || e.key === 'ArrowLeft') keys.a = true;
        if (e.key === 'd' || e.key === 'ArrowRight') keys.d = true;
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'w' || e.key === 'ArrowUp') keys.w = false;
        if (e.key === 's' || e.key === 'ArrowDown') keys.s = false;
        if (e.key === 'a' || e.key === 'ArrowLeft') keys.a = false;
        if (e.key === 'd' || e.key === 'ArrowRight') keys.d = false;
    });
}

function updateControls() {
    if (!myMesh || isChatActive) return;

    let moveX = 0;
    let moveZ = 0;

    if (keys.w) moveZ -= moveSpeed;
    if (keys.s) moveZ += moveSpeed;
    if (keys.a) moveX -= moveSpeed;
    if (keys.d) moveX += moveSpeed;

    if (moveX !== 0 || moveZ !== 0) {
        // Движение колобка
        myMesh.position.x += moveX;
        myMesh.position.z += moveZ;

        // Ограничение границ маленькой карты (30х30 газон)
        myMesh.position.x = Math.max(-14, Math.min(14, myMesh.position.x));
        myMesh.position.z = Math.max(-14, Math.min(14, myMesh.position.z));

        // Эмуляция ФИЗИКИ вращения сферы:
        // Угол поворота = Расстояние / Радиус
        // Направление вращения перпендикулярно направлению движения
        let distZ = moveZ;
        let distX = moveX;

        myMesh.rotation.x += distZ / ballRadius;
        myMesh.rotation.z -= distX / ballRadius;
        
        // Лицо (глаза) направляем по ходу движения
        let angle = Math.atan2(moveX, moveZ);
        myMesh.rotation.y = angle;

        // Отправляем новые координаты и вращение в Firebase
        myFirebaseRef.update({
            x: myMesh.position.x,
            z: myMesh.position.z,
            rotX: myMesh.rotation.x,
            rotY: myMesh.rotation.y,
            rotZ: myMesh.rotation.z
        });
    }
}

// Открытие / закрытие чата
function toggleChat() {
    if (!isChatActive) {
        // Открываем чат
        isChatActive = true;
        chatInput.style.display = 'block';
        chatInput.focus();
        // Сбрасываем движение
        keys = { w: false, a: false, s: false, d: false };
    } else {
        // Закрываем и отправляем сообщение
        isChatActive = false;
        const msg = chatInput.value.trim();
        if (msg.length > 0) {
            myFirebaseRef.update({
                msg: msg,
                msgTime: Date.now() // Отметка времени для отсчета 30 сек
            });
        }
        chatInput.value = '';
        chatInput.style.display = 'none';
    }
}
