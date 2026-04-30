
// Получаем данные карты
import * as mapOblects from './map.js';

startGame()

function startGame() {

    try {
        // const main = document.getElementById('main_menu');
        // main.style.display = "none";
        const canvas = document.getElementById('gameCanvas');
        canvas.style.display = "flex";
        const pause = document.getElementById('pause_menu');
        pause.style.display = "none";
        const ctx = canvas.getContext('2d');

        // Данные для отображения в тулбаре
        let score = 0;
        let gun = '';
        let number_cartridges = '';
        let X = '';
        let Y = '';

        // Функция отрисовки тулбара
        function drawToolbar() {
            // Очистка области тулбара
            ctx.clearRect(0, 0, canvas.width, 40);

            // Рисуем фон тулбара
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, canvas.width, 40);

            // Текст информации
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.fillText('Score: ' + score, 20, 30);
            ctx.fillText('' + gun, 120, 30);
            ctx.fillText('' + number_cartridges, 250, 30);
            ctx.fillText('HP: ' + player.hp, 350, 30);
            ctx.fillText('FPS: ' + Math.round(fps), 500, 30);
            ctx.fillText('X: ' + X, 600, 30);
            ctx.fillText('Y: ' + Y, 700, 30);
        }

        //Генерируем карту
        mapOblects.createMap()

        //Расчет FPS
        let lastFPSCheck = Date.now();
        let frameCount = 0;
        let fps = 0;

        //Импорт объектов карты
        let obstacles = mapOblects.obstaclesObject;
        let doorWays = mapOblects.doorWay;
        let roofLamps_1 = mapOblects.roofLamp_1;
        let roofLamps_2 = mapOblects.roofLamp_2;
        let transitionBlocks = mapOblects.transitionBlock
        let enemies = mapOblects.enemiesObject;
        let backgroundObstacles = mapOblects.backgroundObstaclesObject;

        backgroundObstacles.sort((a, b) => {
            if (a.type === "wall" && b.type !== "wall") return -1;
            if (a.type !== "wall" && b.type === "wall") return 1;
            if (a.type === "wallBrick" && b.type !== "wallBrick") return -1;
            if (a.type !== "wallBrick" && b.type === "wallBrick") return 2;
            return 0;
        });

        let metalWires = mapOblects.metalWire;
        let fieldWidth = mapOblects.fieldWidth;
        let fieldHeight = mapOblects.fieldHeight;

        //Сздаем объект игровой валюты
        let money = []

        //Создаем игрока
        let playerBodyImage = new Image();
        playerBodyImage.src = 'resources/player/body.png';

        let playerHeadImage = new Image();
        playerHeadImage.src = 'resources/player/head.png';

        let playerLeft_armImage = new Image();
        playerLeft_armImage.src = 'resources/player/left_arm.png';

        let playerRight_armImage = new Image();
        playerRight_armImage.src = 'resources/player/right_arm.png';

        let playerLeft_legImage = new Image();
        playerLeft_legImage.src = 'resources/player/left_leg.png';

        let playerRight_legImage = new Image();
        playerRight_legImage.src = 'resources/player/right_leg.png';

        //задержка перехода между этажами
        let accumulatedTime = 0;
        let lastTime = performance.now();
        const interval = 1000;

        const zIndex = {
            leftArm: 1,
            leftLeg: 2,
            rightLeg: 3,
            head: 4,
            torso: 5,
            gun: 6,
            rightArm: 7,
        };

        let player = {
            x: 2790,
            y: 385,
            prevX: 0,
            prevY: 0,
            width: 28,
            height: 87,
            isCrouching: false,
            crouchProgress: 0, // от 0 (стоя) до 1 (полностью присел)
            crouchSpeed: 0.1,
            standHeight: 80,
            crouchHeight: 50,
            standTorsoHeight: 40,
            crouchTorsoHeight: 25,
            positionOnPlatform: 0,
            touchObst: 0,
            // Компоненты тела
            head: {
                x: 0,
                y: 0,
                width: 22,
                height: 22
            },
            torso: {
                x: 0,
                y: 0,
                width: 30,
                height: 40
            },
            arms: {
                left: { angle: 0, length: 25, thickness: 12 },
                right: { angle: 0, length: 25, thickness: 12 }
            },
            legs: {
                left: { angle: 0, length: 30, thickness: 12 },
                right: { angle: 0, length: 30, thickness: 12 }
            },
            legsZone: {
                x: 0,
                y: 0,
                width: 0,
                height: 0
            },
            // Параметры анимации
            walkCycle: 0,
            isMoving: false,
            facingRight: true,
            stateRest: true,
            breathAmplitude: 0.05,
            breathSpeed: 0.002,
            breathOffset: 0,
            // Физические параметры
            speed: 5,
            hp: 10,
            gravity: 0.2,
            lift: -7,
            velocity: 0,
            isJumping: false,
            jumpHeight: 100,
            weaponAngle: 0,

            updatePrevPosition() {
                this.prevX = this.x;
                this.prevY = this.y;
            },
            getVelocity(dt = 1 / 60) {
                return {
                    vx: (this.x - this.prevX) / dt,
                    vy: (this.y - this.prevY) / dt
                };
            },
            jump() {
                if (!this.isJumping) {
                    this.isJumping = true;
                    this.velocity = this.lift;

                }
            },
            update(obstacles, transitionBlocks) {

                // Анимации ходьбы
                if (this.isMoving && !this.isJumping) {
                    this.walkCycle += 0.2;
                    this.legs.left.angle = Math.sin(this.walkCycle) * 0.4;
                    this.legs.right.angle = -Math.sin(this.walkCycle) * 0.4;
                } else {
                    this.legs.left.angle = 0;
                    this.legs.right.angle = 0;
                }
                // Применяем гравитацию
                this.velocity += this.gravity;
                this.y += this.velocity;

                // Обрабатываем столкновения с препятствиями
                obstacles.forEach((obstacle) => {
                    if (this.isColliding(obstacle)) {

                        switch (obstacle.type) {
                            case "medkit":
                                if (this.hp < 100) {
                                    let health_points = this.hp + 25
                                    if (this.hp >= 100) {
                                        this.hp = 100
                                    } else {
                                        this.hp = health_points
                                    }
                                    const indexObstcl = obstacles.findIndex(obst => obst === obstacle);
                                    if (indexObstcl !== -1) {
                                        obstacles.splice(indexObstcl, 1); //Удаляем объект из массива
                                    }
                                }
                                break;
                            case "ammo":
                                let raising = false
                                weapons.forEach((weapon) => {
                                    if (weapon.type == 'pistol' && weapon.stock < weapon.stockAll) {
                                        weapon.stock += 24
                                        if (weapon.stock > weapon.stockAll) weapon.stock = weapon.stockAll
                                        raising = true
                                    }
                                    if (weapon.type == 'assault_rifle' && weapon.stock < weapon.stockAll) {
                                        weapon.stock += 90
                                        if (weapon.stock > weapon.stockAll) weapon.stock = weapon.stockAll
                                        raising = true
                                    }
                                    if (weapon.type == 'shot_gun' && weapon.stock < weapon.stockAll) {
                                        weapon.stock += 8
                                        if (weapon.stock > weapon.stockAll) weapon.stock = weapon.stockAll
                                        raising = true
                                    }
                                    if (weapon.type == 'machine_gun' && weapon.stock < weapon.stockAll) {
                                        weapon.stock += 120
                                        if (weapon.stock > weapon.stockAll) weapon.stock = weapon.stockAll
                                        raising = true
                                    }
                                    if (weapon.type == 'sniper_rifle' && weapon.stock < weapon.stockAll) {
                                        weapon.stock += 10
                                        if (weapon.stock > weapon.stockAll) weapon.stock = weapon.stockAll
                                        raising = true
                                    }
                                    if (raising == true) {
                                        number_cartridges = current_gun.capacity + '/' + current_gun.stock
                                        // obstacles.splice(index, 1)
                                        const indexObstcl = obstacles.findIndex(obst => obst === obstacle);
                                        if (indexObstcl !== -1) {
                                            obstacles.splice(indexObstcl, 1); //Удаляем объект из массива
                                        }
                                    }
                                });
                                break;
                            case "metalPlatform":
                                // Получаем скорость из разницы позиций
                                const { vx, vy } = this.getVelocity(simulation.dt);

                                const hitX = this.x;
                                const hitY = this.y + this.height / 2;

                                handleProjectileHit(hitX, hitY, vx, vy, this.velocity * 2);
                                break;
                        }
                        // Рассчитываем перекрытия по осям
                        const overlapX = Math.min(
                            this.x + this.width - obstacle.x,
                            obstacle.x + obstacle.width - this.x
                        );

                        const overlapY = Math.min(
                            this.y + this.height - obstacle.y,
                            obstacle.y + obstacle.height - this.y
                        );

                        // Определяем направление столкновения
                        if (overlapX < overlapY) {
                            // Горизонтальное столкновение
                            if (this.x < obstacle.x) {
                                // Слева
                                if (obstacle.intObst == true && obstacle.mass) {
                                    obstacle.x = obstacle.x + (this.speed - obstacle.mass > 0 ? this.speed - obstacle.mass : 0.2);
                                }
                                this.x = obstacle.x - this.width;
                            } else {
                                // Справа
                                if (obstacle.intObst == true && obstacle.mass) {
                                    obstacle.x = obstacle.x - (this.speed - obstacle.mass > 0 ? this.speed - obstacle.mass : 0.2);
                                }
                                this.x = obstacle.x + obstacle.width;
                            }

                        } else {
                            // Вертикальное столкновение
                            if (this.y < obstacle.y) {
                                // Сверху
                                this.y = obstacle.y - this.height + 1;
                                this.velocity = 0;
                                this.isJumping = false;
                                if (obstacle.intObst == true) {
                                    if (this.touchObst !== obstacle) {
                                        this.touchObst = obstacle
                                        this.positionOnPlatform = obstacle.x
                                    }
                                    this.x += obstacle.x - this.positionOnPlatform
                                }
                            } else {
                                // Снизу
                                this.y = obstacle.y + obstacle.height;
                                this.velocity = this.gravity; // Отталкивание вниз
                            }
                        }
                    }
                });

                //Обновляем позицию игрока с последним объектом
                updatePositionOnObst(this, this.touchObst)

                //Расчет иентеравала времени перехода между этажами
                const currentTime = performance.now();
                const deltaTime = currentTime - lastTime;
                lastTime = currentTime;

                // Накапливаем время
                accumulatedTime += deltaTime;

                //Переход между этажами
                if (accumulatedTime >= interval) {
                    for (let obstacle of transitionBlocks) {
                        if (this.isColliding(obstacle)) {
                            if (obstacle.position == 'left') {
                                const position = transitionBlocks.find(a => a.position == obstacle.position && a != obstacle)
                                this.y = position.y
                                this.x = position.x + 50
                            }
                            if (obstacle.position == 'right') {
                                const position = transitionBlocks.find(a => a.position == obstacle.position && a != obstacle)
                                this.y = position.y
                                this.x = position.x - 50
                            }
                            accumulatedTime = 0;
                        }
                    }
                }

                // Столкновение с границами холста
                if (this.y > fieldHeight - this.height) {
                    this.y = fieldHeight - this.height;
                    this.velocity = 0;
                    this.isJumping = false;
                }
                if (this.x > fieldWidth - this.width) this.x = fieldWidth - this.width;
                if (this.x < 0) this.x = 0;
            },
            isColliding(obstacle) {
                return this.x < obstacle.x + obstacle.width &&
                    this.x + this.width > obstacle.x &&
                    this.y < obstacle.y + obstacle.height &&
                    this.y + this.height > obstacle.y;
            },
            show() {
                // Создаем локальную очередь отрисовки для этого кадра
                let localDrawQueue = [];

                this.maxTorsoTilt = 0.15;  // Максимальный наклон тела
                this.maxHeadTilt = 0.6;   // Максимальный наклон головы

                //Управление состоянием покоя
                if (!keysPressed.KeyD && !keysPressed.KeyA && !player.isJumping && isMouseDown != true) {
                    this.stateRest = true
                } else {
                    this.stateRest = false
                }

                // Расчет анимации дыхания если персонаж в состоянии покоя
                if (this.stateRest) {
                    this.breathOffset = Math.sin(Date.now() * this.breathSpeed) * this.breathAmplitude;
                } else {
                    this.breathOffset = 0;
                }

                // Расчет наклона тела и головы с учетом дыхания
                let verticalFactor = Math.sin(this.weaponAngle);
                this.torsoTilt = verticalFactor * this.maxTorsoTilt + this.breathOffset * 0.3;
                this.headTilt = verticalFactor * this.maxHeadTilt + this.breathOffset * 0.2;

                // Расчет позиций компонентов
                this.head.x = this.x + 8;
                this.head.y = this.y;
                this.torso.x = this.x;
                this.torso.y = this.y + 20;
                this.legsZone.x = this.x;
                this.legsZone.y = this.torso.y + this.torso.height;
                this.legsZone.width = this.width;
                this.legsZone.height = this.legs.left.length;

                // Вычисляем точку вращения туловища (центр нижней части)
                let torsoPivotX = this.torso.x + this.torso.width / 2;
                let torsoPivotY = this.torso.y + this.torso.height;

                // Функция для вращения точки вокруг центра туловища
                const rotatePointAroundTorso = (pointX, pointY) => {
                    // Смещаем точку относительно центра вращения туловища
                    let relX = pointX - torsoPivotX;
                    let relY = pointY - torsoPivotY;

                    // Поворачиваем точку
                    let rotatedX = relX * Math.cos(this.torsoTilt) - relY * Math.sin(this.torsoTilt);
                    let rotatedY = relX * Math.sin(this.torsoTilt) + relY * Math.cos(this.torsoTilt);

                    // Возвращаем точку в мировые координаты
                    return {
                        x: torsoPivotX + rotatedX,
                        y: torsoPivotY + rotatedY
                    };
                };

                // Вычисляем новые позиции для головы и точек крепления рук с учетом наклона туловища
                let headPos = rotatePointAroundTorso(this.head.x + this.head.width / 2, this.head.y + this.head.height);
                let leftArmPos = rotatePointAroundTorso(this.x + this.width / 3, this.y + 23);
                let rightArmPos = rotatePointAroundTorso(this.x + this.width / 3, this.y + 23);
                let weaponBasePoint = rotatePointAroundTorso(this.x + this.width / 3, this.y + 18);

                let dx = mouseX - weaponBasePoint.x;
                let dy = mouseY - weaponBasePoint.y;

                if (!this.facingRight) {
                    //костыль, разобраться
                    dx = this.weaponAngle < 0 ? -dx + 20 : -dx;
                }

                this.weaponAngle = Math.atan2(dy, dx)

                if (this.stateRest) {
                    this.weaponAngle += this.breathOffset * 0.5;
                }

                let leftGripWorld = { x: 12, y: -40 };
                let rightGripWorld = { x: 12, y: -40 };

                let leftGrip = { x: 12, y: -40 };
                let rightGrip = { x: 12, y: -40 };

                switch (current_gun.type) {
                    case 'pistol':
                        leftGrip = { x: -5, y: -150 };
                        rightGrip = { x: -5, y: -180 };
                        this.arms.right.length = 40
                        this.arms.left.length = 40
                        break;
                    case 'assault_rifle':
                        leftGrip = { x: -10, y: -150 };
                        rightGrip = { x: 10, y: -150 };
                        this.arms.right.length = 30
                        this.arms.left.length = 45
                        break;
                    case 'shot_gun':

                        break;
                    case 'machine_gun':

                        break;
                    case 'sniper_rifle':

                        break;
                }

                // Добавляем параметры отдачи
                let recoilOffsetX = 0;
                let recoilOffsetY = 0;

                if (shooting) {
                    // Параметры отдачи в зависимости от типа оружия
                    switch (current_gun.type) {
                        case 'pistol':
                            recoilOffsetX = (Math.random() - 0.5) * 8;
                            break;
                        case 'assault_rifle':
                            recoilOffsetX = (Math.random() - 0.5) * 8;
                            break;
                        case 'shot_gun':
                            recoilOffsetX = (Math.random() - 0.5) * 6;
                            break;
                    }
                }

                localDrawQueue.push({
                    z: zIndex.gun,
                    draw: () => {
                        ctx.save();
                        // Используем повернутую точку для оружия
                        ctx.translate(weaponBasePoint.x, weaponBasePoint.y);

                        // Добавляем дыхание к углу оружия при отрисовке
                        let finalWeaponAngle = this.weaponAngle;
                        if (this.stateRest) {
                            finalWeaponAngle += this.breathOffset * 0.3;
                        }

                        ctx.rotate(finalWeaponAngle);

                        ctx.translate(recoilOffsetX, recoilOffsetY);

                        // Рисуем оружие в зависимости от типа
                        switch (current_gun.type) {
                            case 'pistol':
                                ctx.drawImage(pm_gun, 30, -5, 16, 16);
                                current_gun.muzzleLocal = { x: 30, y: -2 };
                                break;
                            case 'assault_rifle':
                                ctx.drawImage(akm_gun, 2, -5, 77, 24)
                                current_gun.muzzleLocal = { x: 60, y: 0 };
                                break;
                            case 'shot_gun':
                                ctx.fillStyle = '#4a371b';
                                ctx.fillRect(20, -8, 35, 16);
                                ctx.fillRect(5, -6, 15, 12);
                                current_gun.muzzleLocal = { x: 55, y: 0 };
                                break;
                            case 'machine_gun':
                                ctx.fillStyle = '#2d2d2d';
                                ctx.fillRect(20, -4, 40, 8);
                                ctx.fillRect(15, -2, 8, 12);
                                ctx.fillRect(-5, -6, 10, 12);
                                current_gun.muzzleLocal = { x: 60, y: 0 };
                                break;
                            case 'sniper_rifle':
                                ctx.fillStyle = '#3c3c3c';
                                ctx.fillRect(25, -3, 50, 6);
                                ctx.fillStyle = '#00ffff';
                                ctx.fillRect(40, -8, 10, 16);
                                current_gun.muzzleLocal = { x: 75, y: 0 };
                                break;
                        }

                        ctx.restore();
                    }
                });

                const rotatePoint = (point, angle) => ({
                    x: point.x * Math.cos(angle) - point.y * Math.sin(angle),
                    y: point.x * Math.sin(angle) + point.y * Math.cos(angle)
                });

                // Вычисляем точки крепления оружия для рук
                leftGripWorld = rotatePoint(leftGrip, this.weaponAngle);
                rightGripWorld = rotatePoint(rightGrip, this.weaponAngle);

                // Обновляем углы рук
                let breathArmOffset = this.breathOffset * 0.4;
                this.arms.left.angle = Math.atan2(leftGripWorld.y, leftGripWorld.x) + breathArmOffset;
                this.arms.right.angle = Math.atan2(rightGripWorld.y, rightGripWorld.x) + breathArmOffset;

                // Сохраняем контекст для управления направлением
                ctx.save();
                if (!this.facingRight) {
                    ctx.translate(this.x + this.width / 2, 0);
                    ctx.scale(-1, 1);
                    ctx.translate(-(this.x + this.width / 2), 0);
                }

                // Отрисовка ног с анимацией (без изменений)
                this.drawLimb(localDrawQueue, this.x + 8, this.y + 57, this.legs.left, playerLeft_legImage, zIndex.leftLeg, 'leg', recoilOffsetX, recoilOffsetY);
                this.drawLimb(localDrawQueue, this.x + 22, this.y + 57, this.legs.right, playerRight_legImage, zIndex.rightLeg, 'leg', recoilOffsetX, recoilOffsetY);

                // Отрисовка туловища с наклоном
                if (playerBodyImage.complete) {
                    localDrawQueue.push({
                        z: zIndex.torso,
                        draw: () => {
                            ctx.save();
                            ctx.translate(torsoPivotX, torsoPivotY);
                            ctx.rotate(this.torsoTilt);
                            ctx.drawImage(
                                playerBodyImage,
                                -this.torso.width / 2,
                                -this.torso.height,
                                this.torso.width,
                                this.torso.height
                            );

                            ctx.restore();
                        }
                    });
                }

                // Отрисовка рук с учетом наклона туловища
                this.drawLimb(localDrawQueue, leftArmPos.x, leftArmPos.y, this.arms.left, playerLeft_armImage, zIndex.leftArm, 'arm', recoilOffsetX, recoilOffsetY);
                this.drawLimb(localDrawQueue, rightArmPos.x, rightArmPos.y, this.arms.right, playerRight_armImage, zIndex.rightArm, 'arm', recoilOffsetX, recoilOffsetY);

                if (this.isCrouching) {
                    this.crouchProgress = Math.min(1, this.crouchProgress + this.crouchSpeed);
                } else {
                    this.crouchProgress = Math.max(0, this.crouchProgress - this.crouchSpeed);
                }

                // Интерполируем параметры приседания
                // this.height = this.standHeight - (this.standHeight - this.crouchHeight) * this.crouchProgress;
                // this.torso.height = this.standTorsoHeight - (this.standTorsoHeight - this.crouchTorsoHeight) * this.crouchProgress;

                // Расчет позиций компонентов с учетом приседания
                // this.head.x = this.x + 8;
                // this.head.y = this.y - 5
                // this.torso.x = this.x;
                // this.torso.y = this.y + 15

                // Отрисовка головы с учетом наклона туловища
                if (playerHeadImage.complete) {
                    localDrawQueue.push({
                        z: zIndex.head,
                        draw: () => {
                            ctx.save();
                            // Точка вращения головы (шея)
                            let headPivotX = headPos.x;
                            let headPivotY = headPos.y;
                            ctx.translate(headPivotX, headPivotY);
                            // Наклон головы относительно туловища
                            ctx.rotate(this.headTilt);
                            ctx.drawImage(
                                playerHeadImage,
                                -this.head.width / 2,
                                -this.head.height,
                                this.head.width,
                                this.head.height
                            );
                            ctx.restore()
                        }
                    });
                }

                // Сортируем и отрисовываем все элементы
                localDrawQueue.sort((a, b) => a.z - b.z).forEach(item => item.draw());

                // Восстанавливаем контекст
                ctx.restore();
            },
            drawLimb(queue, startX, startY, limb, image, z, type, recoilOffsetX, recoilOffsetY) {
                queue.push({
                    z,
                    draw: () => {
                        ctx.save();
                        ctx.translate(startX, startY);
                        ctx.rotate(limb.angle);

                        // Применяем отдачу только к рукам
                        if (type === 'arm') {
                            ctx.translate(recoilOffsetY, recoilOffsetX);
                        }

                        ctx.drawImage(
                            image,
                            -limb.thickness / 2,
                            0,
                            limb.thickness,
                            limb.length
                        );

                        ctx.restore();
                    }
                });

            },

        };

        function updatePositionOnObst(obstacle, currentObst) {
            obstacle.positionOnPlatform = currentObst.x
        }

        let debbug_mode = false

        function debbugMode() {

            // Устанавливаем стили для отладки
            ctx.lineWidth = 2;

            // Отрисовка общего bounding box персонажа (красный)
            ctx.strokeStyle = 'red';
            ctx.strokeRect(player.x, player.y, player.width, player.height);

            // Отрисовка головы (желтый)
            ctx.strokeStyle = 'yellow';
            ctx.strokeRect(player.head.x, player.head.y, player.head.width, player.head.height);

            // Отрисовка туловища (синий)
            ctx.strokeStyle = 'blue';
            ctx.strokeRect(player.torso.x, player.torso.y, player.torso.width, player.torso.height);

            ctx.strokeStyle = 'green';
            ctx.strokeRect(player.legsZone.x, player.legsZone.y, player.legsZone.width, player.legsZone.height);

            X = mouseX.toFixed(0)
            Y = mouseY.toFixed(0)


            let playerCenterX = player.x + player.width / 2;
            let playerCenterY = player.y + 18;

            //Центр вкладки оружия
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(playerCenterX, playerCenterY, 4, 0, 2 * Math.PI);
            ctx.fill();

            //луч от центра до прицела
            ctx.beginPath();
            ctx.moveTo(playerCenterX, playerCenterY);
            ctx.lineTo(mouseX, mouseY);
            ctx.stroke();
        }

        let pm_gun = new Image();
        pm_gun.src = 'resources/guns/pm.png';

        let akm_gun = new Image();
        akm_gun.src = 'resources/guns/akm.png';

        //Вооружение
        let weapons = [
            {
                type: 'pistol', name: 'ПМ', damage: 1, auto: false, capacity: 8, capacityAll: 8, shotInterval: 250, pellets: 1,
                stock: 32, stockAll: 32, minSpreadRad: 0, spreadRad: 0, speed_bullet: 14,
            },

            {
                type: 'assault_rifle', name: 'АКМ', damage: 2, auto: true, shotInterval: 600, pellets: 1,
                capacity: 30, capacityAll: 30, stock: 120, stockAll: 120, minSpreadRad: 0, spreadRad: 0, speed_bullet: 18,
            },

            {
                type: 'shot_gun', name: 'Двустволка', damage: 2, auto: false, shotInterval: 400, pellets: 5,
                capacity: 2, capacityAll: 2, stock: 14, stockAll: 14, spreadRad: 8, speed_bullet: 18,
            },

            {
                type: 'machine_gun', name: 'РПК', damage: 3, auto: true, shotInterval: 600, pellets: 1,
                capacity: 45, capacityAll: 45, stock: 180, stockAll: 180, minSpreadRad: 0, spreadRad: 0, speed_bullet: 20,
            },

            {
                type: 'sniper_rifle', name: 'M700', damage: 5, auto: false, shotInterval: 60, pellets: 1,
                capacity: 5, capacityAll: 5, stock: 25, stockAll: 25, spreadRad: 2, speed_bullet: 30,
            }
        ];

        let shooting = false
        let spread = 0

        //Звук выстрела
        const shootSound = new Audio('resources/sound/pistol.wav');
        shootSound.volume = 0.2; // Громкость от 0 до 1

        function playShootSound() {
            shootSound.currentTime = 0; // Перемотка в начало
            shootSound.play().catch(e => console.log("Звук не воспроизведён: ", e));
        }

        //Оружие по умолчанию
        let current_gun = weapons[0]
        gun = current_gun.name
        spread = current_gun.minSpreadRad
        number_cartridges = current_gun.capacity + '/' + current_gun.stock

        //Расчет скорострельности
        let lastShotTime = performance.now();
        let shotInterval = 0
        shotInterval = current_gun.shotInterval

        function updateWeapon(curr_gun) {
            gun = curr_gun.name
            current_gun = curr_gun
            number_cartridges = current_gun.capacity + '/' + current_gun.stock
            shotInterval = 60000 / current_gun.shotInterval;
            if (curr_gun.minSpreadRad) spread = current_gun.minSpreadRad
        }

        //Расчет остатка патронов в магазине/всего
        function calcCapacity(curr_gun) {
            number_cartridges = curr_gun.capacity + '/' + curr_gun.stock;
            if (curr_gun.capacity <= 0 && curr_gun.stock > 0) {
                setTimeout(() => {
                    if (curr_gun.stock > curr_gun.capacityAll) {
                        curr_gun.capacity = curr_gun.capacityAll
                        curr_gun.stock = curr_gun.stock - curr_gun.capacityAll
                    } else {
                        curr_gun.capacity = curr_gun.stock
                        curr_gun.stock = 0
                    }
                    number_cartridges = current_gun.capacity + '/' + current_gun.stock;
                }, 2000);
            }
        }

        function calcCapacityIncome(curr_gun) {
            if (curr_gun.capacity > 0 && curr_gun.capacity < curr_gun.capacityAll && curr_gun.stock > 0) {
                setTimeout(() => {
                    let cap = curr_gun.stock + curr_gun.capacity
                    if (cap > curr_gun.capacityAll) {
                        curr_gun.stock = cap - curr_gun.capacityAll
                        curr_gun.capacity = curr_gun.capacityAll
                    } else {
                        curr_gun.stock = cap
                        curr_gun.stock = 0
                    }

                    number_cartridges = current_gun.capacity + '/' + current_gun.stock;
                }, 2000);
            }
        }

        function getMuzzlePoint() {

            let torsoPivotX = player.torso.x + player.torso.width / 2;
            let torsoPivotY = player.torso.y + player.torso.height;

            const rotatePointAroundTorso = (pointX, pointY) => {
                // Смещаем точку относительно центра вращения туловища
                let relX = pointX - torsoPivotX;
                let relY = pointY - torsoPivotY;

                // Поворачиваем точку
                let rotatedX = relX * Math.cos(player.torsoTilt) - relY * Math.sin(player.weaponAngle < 0 && !player.facingRight ? -player.torsoTilt * 2 : player.torsoTilt);
                let rotatedY = relX * Math.sin(player.torsoTilt) + relY * Math.cos(player.torsoTilt);

                // Возвращаем точку в мировые координаты
                return {
                    x: torsoPivotX + rotatedX,
                    y: torsoPivotY + rotatedY
                };
            };

            let weaponBasePoint = rotatePointAroundTorso(player.x + player.width / 3, player.y + 18);

            let muzzleLocal = current_gun.muzzleLocal
            let dx = mouseX - weaponBasePoint.x;
            const dy = mouseY - weaponBasePoint.y;

            let angle = Math.atan2(dy, dx);

            if (!player.facingRight) {
                muzzleLocal.y = -muzzleLocal.y;
            }

            // Преобразование локальных координат в мировые
            const x_rot = muzzleLocal.x * Math.cos(angle) - muzzleLocal.y * Math.sin(angle);
            const y_rot = muzzleLocal.x * Math.sin(angle) + muzzleLocal.y * Math.cos(angle);

            return {
                x: weaponBasePoint.x + x_rot,
                y: weaponBasePoint.y + y_rot,
                angle: angle
            };
        }

        let sight_size = 30;

        let sight_pistol = new Image();
        sight_pistol.src = 'resources/sights/sight_pistol.png';
        let sight_auto = new Image();
        sight_auto.src = 'resources/sights/sight_auto.png';
        let sight_shotgun = new Image();
        sight_shotgun.src = 'resources/sights/sight_shotgun.png';
        let sight_mg = new Image();
        sight_mg.src = 'resources/sights/sight_mg.png';
        let sight_sniper = new Image();
        sight_sniper.src = 'resources/sights/sight_sniper.png';

        //Отображение прицела
        function drawCrosshair(x, y) {

            switch (current_gun.type) {
                case 'pistol':
                    ctx.drawImage(sight_pistol, x - sight_size / 2, y - sight_size / 2, sight_size, sight_size);
                    break;
                case 'assault_rifle':
                    ctx.drawImage(sight_auto, x - sight_size / 2, y - sight_size / 2, sight_size, sight_size);
                    break;
                case 'shot_gun':
                    ctx.drawImage(sight_shotgun, x - sight_size / 2, y - sight_size / 2, sight_size, sight_size);
                    break;
                case 'machine_gun':
                    ctx.drawImage(sight_mg, x - sight_size / 2, y - sight_size / 2, sight_size, sight_size);
                    break;
                case 'sniper_rifle':
                    ctx.drawImage(sight_sniper, x - sight_size / 2, y - sight_size / 2, sight_size, sight_size);
                    break;
            }
            ctx.restore()
        }

        // Массивы для гранат и частиц
        let grenades = [];
        let particles = [];
        const grenadeSettings = {
            gravity: 0.2,
            throwSpeed: 12,
            explosionRadius: 100,
            particleGravity: 0.2,
            restitution: 0.7,
            minSpeed: 1.0
        };

        function createGrenade() {
            const startX = player.x + player.width / 2;
            const startY = player.y + player.height / 3;

            // Направление броска к курсору
            const dx = mouseX - startX;
            const dy = mouseY - startY;
            const angle = Math.atan2(dy, dx);

            const throwSpeed = 10;
            grenades.push({
                x: startX + Math.cos(angle) * 20,
                y: startY + Math.sin(angle) * 20,
                velocityX: Math.cos(angle) * throwSpeed,
                velocityY: Math.sin(angle) * throwSpeed,
                angle: angle,
                timer: 2000,
                radius: 5
            });
        }

        function updateGrenades(obstacles) {
            for (let i = grenades.length - 1; i >= 0; i--) {
                const grenade = grenades[i];

                // Физика движения
                grenade.velocityY += grenadeSettings.gravity;
                grenade.x += grenade.velocityX;
                grenade.y += grenade.velocityY;

                // Проверяем, не упала ли граната "в спячку"
                const currentSpeed = Math.sqrt(grenade.velocityX * grenade.velocityX + grenade.velocityY * grenade.velocityY);
                if (currentSpeed < grenadeSettings.minSpeed && grenade.y > fieldHeight - 20) {
                    grenade.timer = Math.min(grenade.timer, 100); // Ускоряем взрыв
                }

                // Обработка столкновений с препятствиями
                let collisionHandled = false;
                for (let j = 0; j < obstacles.length; j++) {
                    const obstacle = obstacles[j];
                    const collision = getCircleRectCollision(grenade, obstacle);

                    if (collision.collided) {
                        collisionHandled = true;

                        // Улучшенное выталкивание - гарантируем выход из коллизии
                        const pushDistance = collision.depth + 0.1;
                        grenade.x += collision.normalX * pushDistance;
                        grenade.y += collision.normalY * pushDistance;

                        // Рассчёт отражения скорости
                        const dot = grenade.velocityX * collision.normalX + grenade.velocityY * collision.normalY;

                        // Новые скорости с учётом потери энергии
                        grenade.velocityX = (grenade.velocityX - 2 * dot * collision.normalX) * grenadeSettings.restitution;
                        grenade.velocityY = (grenade.velocityY - 2 * dot * collision.normalY) * grenadeSettings.restitution;

                        break;
                    }
                }

                for (let j = 0; j < roofLamps_1.length; j++) {
                    const roofLamp = roofLamps_1[j];
                    const collision = getCircleRectCollision(grenade, roofLamp);

                    if (collision.collided) {
                        collisionHandled = true;

                        // Улучшенное выталкивание - гарантируем выход из коллизии
                        const pushDistance = collision.depth + 0.1;
                        grenade.x += collision.normalX * pushDistance;
                        grenade.y += collision.normalY * pushDistance;

                        // Рассчёт отражения скорости
                        const dot = grenade.velocityX * collision.normalX + grenade.velocityY * collision.normalY;

                        // Новые скорости с учётом потери энергии
                        grenade.velocityX = (grenade.velocityX - 2 * dot * collision.normalX) * grenadeSettings.restitution;
                        grenade.velocityY = (grenade.velocityY - 2 * dot * collision.normalY) * grenadeSettings.restitution;

                        if (roofLamp.state == "on") {

                            offLampAnimation(roofLamp)

                            roofLamp.state = "off";
                        }

                        break;
                    }
                }

                for (let j = 0; j < roofLamps_2.length; j++) {
                    const roofLamp = roofLamps_2[j];
                    const collision = getCircleRectCollision(grenade, roofLamp);

                    if (collision.collided) {

                        if (roofLamp.state == "on") {

                            offLampAnimation(roofLamp)

                            roofLamp.state = "off";
                        }

                        break;
                    }
                }

                // Обработка столкновений с границами
                let boundaryCollision = false;
                let normalX = 0;
                let normalY = 0;

                // Левая граница
                if (grenade.x - grenade.radius < 0) {
                    normalX = 1;
                    grenade.x = grenade.radius + 1;
                    boundaryCollision = true;
                }
                // Правая граница
                else if (grenade.x + grenade.radius > fieldWidth) {
                    normalX = -1;
                    grenade.x = fieldWidth - grenade.radius - 1;
                    boundaryCollision = true;
                }

                // Верхняя граница
                if (grenade.y - grenade.radius < 0) {
                    normalY = 1;
                    grenade.y = grenade.radius + 1;
                    boundaryCollision = true;
                }
                // Нижняя граница
                else if (grenade.y + grenade.radius > fieldHeight) {
                    normalY = -1;
                    grenade.y = fieldHeight - grenade.radius - 1;
                    boundaryCollision = true;
                }

                // Применяем отражение если было столкновение
                if (boundaryCollision) {
                    const dot = grenade.velocityX * normalX + grenade.velocityY * normalY;
                    grenade.velocityX = (grenade.velocityX - 2 * dot * normalX) * grenadeSettings.restitution;
                    grenade.velocityY = (grenade.velocityY - 2 * dot * normalY) * grenadeSettings.restitution;

                    // Для нижней границы - дополнительное трение
                    if (normalY === -1) {
                        grenade.velocityX *= 0.8;
                    }
                }

                // Таймер и взрыв
                grenade.timer -= 16;
                if (grenade.timer <= 0) {
                    createExplosion(grenade.x, grenade.y);
                    grenades.splice(i, 1);
                }
            }
        }

        // Улучшенная функция определения столкновений
        function getCircleRectCollision(circle, rect) {
            // Находим ближайшую точку на прямоугольнике
            const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
            const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

            // Рассчитываем расстояние до ближайшей точки
            const dx = circle.x - closestX;
            const dy = circle.y - closestY;
            const distanceSquared = dx * dx + dy * dy;
            const radiusSquared = circle.radius * circle.radius;

            // Проверяем столкновение
            if (distanceSquared < radiusSquared) {
                if (distanceSquared === 0) {
                    // Находим ближайшую грань
                    const toLeft = circle.x - rect.x;
                    const toRight = rect.x + rect.width - circle.x;
                    const toTop = circle.y - rect.y;
                    const toBottom = rect.y + rect.height - circle.y;

                    const minDist = Math.min(toLeft, toRight, toTop, toBottom);

                    if (minDist === toLeft) {
                        return {
                            collided: true,
                            normalX: 1, // Нормаль направлена вправо
                            normalY: 0,
                            depth: circle.radius - toLeft
                        };
                    } else if (minDist === toRight) {
                        return {
                            collided: true,
                            normalX: -1, // Нормаль направлена влево
                            normalY: 0,
                            depth: circle.radius - toRight
                        };
                    } else if (minDist === toTop) {
                        return {
                            collided: true,
                            normalX: 0,
                            normalY: 1, // Нормаль направлена вниз
                            depth: circle.radius - toTop
                        };
                    } else {
                        return {
                            collided: true,
                            normalX: 0,
                            normalY: -1, // Нормаль направлена вверх
                            depth: circle.radius - toBottom
                        };
                    }
                }

                const distance = Math.sqrt(distanceSquared);
                const depth = circle.radius - distance;
                return {
                    collided: true,
                    normalX: dx / distance,
                    normalY: dy / distance,
                    depth: depth
                };
            }

            return { collided: false };
        }

        function createExplosion(x, y) {
            for (let i = 0; i < 50; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 5 + 2;
                particles.push({
                    x: x,
                    y: y,
                    velocityX: Math.cos(angle) * speed,
                    velocityY: Math.sin(angle) * speed,
                    life: 1.0,
                    radius: Math.random() * 3 + 2
                });
            }

            // Обновляем расчет урона с новым радиусом
            enemies.forEach((enemy, index) => {
                const dx = enemy.x - x;
                const dy = enemy.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < grenadeSettings.explosionRadius) {
                    enemy.hp -= 50 * (1 - distance / grenadeSettings.explosionRadius);
                    if (enemy.hp <= 0) {
                        enemies.splice(index, 1);
                        score++;
                    }
                }
            });
        }

        function drawGrenades() {
            grenades.forEach(g => {
                ctx.fillStyle = '#00ff00';
                ctx.beginPath();
                // Убрано смещение при отрисовке
                ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        function updateParticles() {
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.velocityX;
                p.y += p.velocityY;

                // Используем отдельную гравитацию для частиц
                p.velocityY += grenadeSettings.particleGravity;

                p.life -= 0.02;
                if (p.life <= 0) particles.splice(i, 1);
            }
        }

        function drawParticles() {
            particles.forEach(p => {
                ctx.fillStyle = 'rgba(255,' + (150 * p.life | 0) + ',0,' + p.life + ')'
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        //Управление камерой
        let camera = {
            x: player.x,
            y: player.y,
            width: canvas.width,
            height: canvas.height,
            smoothness: 0.1
        };

        camera.width = canvas.width;
        camera.height = canvas.height;

        function updateCamera() {
            let targetX = player.x + player.width / 2 - camera.width / 2;
            let targetY = player.y + player.height / 2 - camera.height / 2;

            // Плавное перемещение камеры к цели

            camera.x += (targetX - camera.x) * camera.smoothness;
            camera.y += (targetY - camera.y) * camera.smoothness;

            // Ограничения камеры, чтобы не выходить за пределы мира (если есть)
            // camera.x = Math.max(0, camera.x);
        }

        // Обработчик ресайза
        window.addEventListener('resize', () => {

            // Обновляем размеры камеры
            camera.width = canvas.width;
            camera.height = canvas.height;
        });

        //Объекты окружения
        const woodBoxImg = new Image();
        woodBoxImg.src = 'resources/obstacles/woodbox.png';

        const obstaclesFloor = new Image();
        obstaclesFloor.src = 'resources/obstacles/floor.png';

        const roofImg = new Image();
        roofImg.src = 'resources/obstacles/roof.png';

        const equipmentImg = new Image();
        equipmentImg.src = 'resources/obstacles/equipment.png';

        const metalCrate_1Img = new Image()
        metalCrate_1Img.src = 'resources/obstacles/metalCrate.png';

        const metalCrate_2Img = new Image()
        metalCrate_2Img.src = 'resources/obstacles/metalCrate2.png';

        const metalCrate_3Img = new Image()
        metalCrate_3Img.src = 'resources/obstacles/metalCrate3.png';

        const metalPlit_1Img = new Image()
        metalPlit_1Img.src = 'resources/obstacles/metalPlit.png';

        const metalPlit_2Img = new Image()
        metalPlit_2Img.src = 'resources/obstacles/metalPlit2.png';

        const metalPlit_3Img = new Image()
        metalPlit_3Img.src = 'resources/obstacles/metalPlit3.png';

        const metalPlatformImg = new Image()
        metalPlatformImg.src = 'resources/obstacles/metalPlatform.png';

        const doorWayImg = new Image()
        doorWayImg.src = 'resources/obstacles/doorWay.png';

        const metalCloset_1Img = new Image()
        metalCloset_1Img.src = 'resources/obstacles/metal_closet.png';

        const metalCloset_2Img = new Image()
        metalCloset_2Img.src = 'resources/obstacles/metal_closet_2.png';

        const metalCloset_3Img = new Image()
        metalCloset_3Img.src = 'resources/obstacles/metal_closet_3.png';

        const wooden_tableImg = new Image()
        wooden_tableImg.src = 'resources/obstacles/wooden_table.png';

        const dynamicObstacleImage = new Image();
        dynamicObstacleImage.src = 'resources/obstacles/dynamicObstacle.jpg';

        const obstaclesWall = new Image();
        obstaclesWall.src = 'resources/obstacles/brickFloor.jpg';

        const expBarrelImg = new Image()
        expBarrelImg.src = 'resources/interactive_objects/explosiveBarrel.png';

        const roofLamp_1Img = new Image()
        roofLamp_1Img.src = 'resources/interactive_objects/roofLamp.png';

        const roofLamp_1_offImg = new Image()
        roofLamp_1_offImg.src = 'resources/interactive_objects/roofLampOff.png';

        const roofLamp_2Img = new Image()
        roofLamp_2Img.src = 'resources/interactive_objects/roofLamp2.png';

        const roofLamp_2OffImg = new Image()
        roofLamp_2OffImg.src = 'resources/interactive_objects/roofLamp2Off.png';

        const ammo_boxImg = new Image()
        ammo_boxImg.src = 'resources/interactive_objects/ammo_box.png';

        const medkitImg = new Image()
        medkitImg.src = 'resources/interactive_objects/medkit.png';

        const tvImg = new Image()
        tvImg.src = 'resources/interactive_objects/tv.png';

        const broken_tvImg = new Image()
        broken_tvImg.src = 'resources/interactive_objects/broken_tv.png';

        const moneyStackImg = new Image()
        moneyStackImg.src = 'resources/interactive_objects/moneyStack.png';

        const plit = new Image();
        plit.src = 'resources/background/plit.png';

        const plit_2 = new Image();
        plit_2.src = 'resources/background/plit_2.png';

        const plit_3 = new Image();
        plit_3.src = 'resources/background/plit_3.png';

        const plit_4 = new Image();
        plit_4.src = 'resources/background/plit_4.png';

        const woodWallImg = new Image();
        woodWallImg.src = 'resources/background/woodWall.png';

        const woodWallImg_2 = new Image();
        woodWallImg_2.src = 'resources/background/woodWall_2.png';

        const woodWallImg_3 = new Image();
        woodWallImg_3.src = 'resources/background/woodWall_3.png';

        const woodWallImg_4 = new Image();
        woodWallImg_4.src = 'resources/background/woodWall_4.png';

        const woodWallImg_5 = new Image();
        woodWallImg_5.src = 'resources/background/woodWall_5.png';

        const info_boardImg = new Image();
        info_boardImg.src = 'resources/background/info_board.png';

        const info_board_2Img = new Image();
        info_board_2Img.src = 'resources/background/info_board_2.png';

        const metal_sheetImg = new Image();
        metal_sheetImg.src = 'resources/background/metal_sheet.png';

        const metal_sheet_2Img = new Image();
        metal_sheet_2Img.src = 'resources/background/metal_sheet_2.png';

        const wooden_sheetImg = new Image();
        wooden_sheetImg.src = 'resources/background/wooden_sheet.png';

        const wooden_sheet_2Img = new Image();
        wooden_sheet_2Img.src = 'resources/background/wooden_sheet_2.png';

        const electrical_panelBackgroundImg = new Image();
        electrical_panelBackgroundImg.src = 'resources/background/electrical_panel.png';

        const vent_grilleImg = new Image();
        vent_grilleImg.src = 'resources/background/vent_grille.png';

        const vent_boxImg = new Image();
        vent_boxImg.src = 'resources/background/vent_box.png';

        const screwImg = new Image();
        screwImg.src = 'resources/background/screw.png';

        const pipesBackgroundsImg = new Image();
        pipesBackgroundsImg.src = 'resources/background/pipes.png';

        const wallBrickBackgroundImg = new Image();
        wallBrickBackgroundImg.src = 'resources/background/wallBackground.png'

        const floorBackgroundImg = new Image();
        floorBackgroundImg.src = 'resources/background/floor.png';

        const metalWireImg = new Image();
        metalWireImg.src = 'resources/obstacles/metalWire.png';

        let white_noise = [
            "resources/interactive_objects/white_noise/frame_0000.png",
            "resources/interactive_objects/white_noise/frame_0001.png",
            "resources/interactive_objects/white_noise/frame_0002.png",
            "resources/interactive_objects/white_noise/frame_0003.png",
            "resources/interactive_objects/white_noise/frame_0004.png",
            "resources/interactive_objects/white_noise/frame_0005.png",
            "resources/interactive_objects/white_noise/frame_0006.png",
            "resources/interactive_objects/white_noise/frame_0007.png",
            "resources/interactive_objects/white_noise/frame_0008.png",
            "resources/interactive_objects/white_noise/frame_0009.png",
            "resources/interactive_objects/white_noise/frame_0010.png",
            "resources/interactive_objects/white_noise/frame_0011.png"
        ];

        let doom = [
            "resources/interactive_objects/doom/frame_0000.gif",
            "resources/interactive_objects/doom/frame_0001.gif",
            "resources/interactive_objects/doom/frame_0002.gif",
            "resources/interactive_objects/doom/frame_0003.gif",
            "resources/interactive_objects/doom/frame_0004.gif",
            "resources/interactive_objects/doom/frame_0005.gif",
            "resources/interactive_objects/doom/frame_0006.gif",
            "resources/interactive_objects/doom/frame_0007.gif",
            "resources/interactive_objects/doom/frame_0008.gif",
            "resources/interactive_objects/doom/frame_0009.gif",
            "resources/interactive_objects/doom/frame_0010.gif",
            "resources/interactive_objects/doom/frame_0011.gif",
            "resources/interactive_objects/doom/frame_0012.gif",
            "resources/interactive_objects/doom/frame_0013.gif",
            "resources/interactive_objects/doom/frame_0014.gif",
            "resources/interactive_objects/doom/frame_0015.gif",
            "resources/interactive_objects/doom/frame_0016.gif",
            "resources/interactive_objects/doom/frame_0017.gif",
            "resources/interactive_objects/doom/frame_0018.gif",
            "resources/interactive_objects/doom/frame_0019.gif",
            "resources/interactive_objects/doom/frame_0020.gif",
            "resources/interactive_objects/doom/frame_0021.gif",
            "resources/interactive_objects/doom/frame_0022.gif",
            "resources/interactive_objects/doom/frame_0023.gif",
            "resources/interactive_objects/doom/frame_0024.gif",
            "resources/interactive_objects/doom/frame_0025.gif",
            "resources/interactive_objects/doom/frame_0026.gif",
            "resources/interactive_objects/doom/frame_0027.gif",
            "resources/interactive_objects/doom/frame_0028.gif",
            "resources/interactive_objects/doom/frame_0029.gif",
            "resources/interactive_objects/doom/frame_0030.gif",
            "resources/interactive_objects/doom/frame_0031.gif",
            "resources/interactive_objects/doom/frame_0032.gif",
            "resources/interactive_objects/doom/frame_0033.gif",
            "resources/interactive_objects/doom/frame_0034.gif",
            "resources/interactive_objects/doom/frame_0035.gif",
            "resources/interactive_objects/doom/frame_0036.gif",
            "resources/interactive_objects/doom/frame_0037.gif",
            "resources/interactive_objects/doom/frame_0038.gif",
            "resources/interactive_objects/doom/frame_0039.gif",
            "resources/interactive_objects/doom/frame_0040.gif",
            "resources/interactive_objects/doom/frame_0041.gif",
            "resources/interactive_objects/doom/frame_0042.gif",
            "resources/interactive_objects/doom/frame_0043.gif",
            "resources/interactive_objects/doom/frame_0044.gif",
            "resources/interactive_objects/doom/frame_0045.gif",
            "resources/interactive_objects/doom/frame_0046.gif",
            "resources/interactive_objects/doom/frame_0047.gif",
            "resources/interactive_objects/doom/frame_0048.gif",
            "resources/interactive_objects/doom/frame_0049.gif",
            "resources/interactive_objects/doom/frame_0050.gif",
            "resources/interactive_objects/doom/frame_0051.gif",
            "resources/interactive_objects/doom/frame_0052.gif",
            "resources/interactive_objects/doom/frame_0053.gif",
            "resources/interactive_objects/doom/frame_0054.gif",
            "resources/interactive_objects/doom/frame_0055.gif",
            "resources/interactive_objects/doom/frame_0056.gif",
            "resources/interactive_objects/doom/frame_0057.gif",
            "resources/interactive_objects/doom/frame_0058.gif",
            "resources/interactive_objects/doom/frame_0059.gif",
            "resources/interactive_objects/doom/frame_0060.gif",
            "resources/interactive_objects/doom/frame_0061.gif",
            "resources/interactive_objects/doom/frame_0062.gif",
            "resources/interactive_objects/doom/frame_0063.gif",
            "resources/interactive_objects/doom/frame_0064.gif",
            "resources/interactive_objects/doom/frame_0065.gif",
            "resources/interactive_objects/doom/frame_0066.gif",
            "resources/interactive_objects/doom/frame_0067.gif",
            "resources/interactive_objects/doom/frame_0068.gif",
            "resources/interactive_objects/doom/frame_0069.gif",
            "resources/interactive_objects/doom/frame_0070.gif",
            "resources/interactive_objects/doom/frame_0071.gif",
            "resources/interactive_objects/doom/frame_0072.gif",
            "resources/interactive_objects/doom/frame_0073.gif",
            "resources/interactive_objects/doom/frame_0074.gif",
            "resources/interactive_objects/doom/frame_0075.gif",
            "resources/interactive_objects/doom/frame_0076.gif"
        ];

        function drawObstacles() {

            for (const doorWay of doorWays) {
                ctx.drawImage(doorWayImg, doorWay.x, doorWay.y, doorWay.width, doorWay.height);
            }

            for (const mon of money) {
                ctx.drawImage(moneyStackImg, mon.x, mon.y, mon.width, mon.height);
            }

            for (let i = 0; i < obstacles.length; i++) {
                switch (obstacles[i].type) {
                    case "floor":
                        ctx.drawImage(obstaclesFloor, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "roof":
                        ctx.drawImage(roofImg, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "obstacleWall":
                        ctx.drawImage(obstaclesWall, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "dynamic_obstacles":
                        ctx.drawImage(dynamicObstacleImage, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "equipment":
                        ctx.drawImage(equipmentImg, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "metalCreate_1":
                        ctx.drawImage(metalCrate_1Img, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "metalCreate_2":
                        ctx.drawImage(metalCrate_2Img, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "metalCreate_3":
                        ctx.drawImage(metalCrate_3Img, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "metalPlit_1":
                        ctx.drawImage(metalPlit_1Img, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "metalPlit_2":
                        ctx.drawImage(metalPlit_2Img, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "metalPlit_3":
                        ctx.drawImage(metalPlit_3Img, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "metal_closet_1":
                        ctx.drawImage(metalCloset_1Img, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "metal_closet_2":
                        ctx.drawImage(metalCloset_2Img, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "metal_closet_3":
                        ctx.drawImage(metalCloset_3Img, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "wooden_table":
                        ctx.drawImage(wooden_tableImg, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "expBarrel":
                        ctx.drawImage(expBarrelImg, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "woodBox":
                        ctx.drawImage(woodBoxImg, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "tv":
                        if (obstacles[i].strength > 0) {
                            yop(obstacles[i])
                            ctx.drawImage(tvImg, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        } else {
                            ctx.drawImage(broken_tvImg, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        }
                        break;
                    case "medkit":
                        ctx.drawImage(medkitImg, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;
                    case "ammo":
                        ctx.drawImage(ammo_boxImg, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
                        break;

                }
            }

        }

        //Отрисовываем элементы фона
        function drawBackground() {
            ctx.save()
            for (let i = 0; i < backgroundObstacles.length; i++) {
                switch (backgroundObstacles[i].type) {

                    case "floor":
                        const floor = backgroundObstacles[i]
                        ctx.drawImage(floorBackgroundImg, floor.x, floor.y, floor.width, floor.height);
                        break;

                    case "wall":
                        const wall = backgroundObstacles[i]

                        if (wall.variant == 1) ctx.drawImage(plit, wall.x, wall.y, wall.width, wall.height);
                        if (wall.variant == 2) ctx.drawImage(plit_2, wall.x, wall.y, wall.width, wall.height);
                        if (wall.variant == 3) ctx.drawImage(plit_3, wall.x, wall.y, wall.width, wall.height);
                        if (wall.variant == 4) ctx.drawImage(plit_4, wall.x, wall.y, wall.width, wall.height);
                        break;

                    case "wallBrick":
                        const wallBrick = backgroundObstacles[i];
                        ctx.drawImage(wallBrickBackgroundImg, wallBrick.x, wallBrick.y, wallBrick.width, wallBrick.height);
                        break;

                    case "woodWall":
                        const woodWall = backgroundObstacles[i]
                        if (woodWall.variant == 1) ctx.drawImage(woodWallImg, woodWall.x, woodWall.y, woodWall.width, woodWall.height);
                        if (woodWall.variant == 2) ctx.drawImage(woodWallImg_2, woodWall.x, woodWall.y, woodWall.width, woodWall.height);
                        if (woodWall.variant == 3) ctx.drawImage(woodWallImg_3, woodWall.x, woodWall.y, woodWall.width, woodWall.height);
                        if (woodWall.variant == 4) ctx.drawImage(woodWallImg_4, woodWall.x, woodWall.y, woodWall.width, woodWall.height);
                        if (woodWall.variant == 5) ctx.drawImage(woodWallImg_5, woodWall.x, woodWall.y, woodWall.width, woodWall.height);
                        break;

                    case "electrical_panel":
                        const electrical_panel = backgroundObstacles[i];
                        ctx.drawImage(electrical_panelBackgroundImg, electrical_panel.x, electrical_panel.y, electrical_panel.width, electrical_panel.height);
                        break;

                    case "pipes":
                        const pipe = backgroundObstacles[i];
                        ctx.drawImage(pipesBackgroundsImg, pipe.x, pipe.y, pipe.width, pipe.height);
                        break;

                    case "info_board":
                        const board = backgroundObstacles[i];
                        ctx.drawImage(info_boardImg, board.x, board.y, board.width, board.height);
                        break;

                    case "info_board_2":
                        const board_2 = backgroundObstacles[i];
                        ctx.drawImage(info_board_2Img, board_2.x, board_2.y, board_2.width, board_2.height);
                        break;

                    case "vent_grille":
                        const vent = backgroundObstacles[i];
                        ctx.drawImage(vent_grilleImg, vent.x, vent.y, vent.width, vent.height);
                        break;
                }
            }

            // Обновляем углы всех вентиляторов
            const vent_boxBackgrounds = backgroundObstacles.filter(obj => obj.type === "vent_box")
            vent_boxBackgrounds.forEach(vent => {
                vent.current_angle += vent.speed_screw * (Math.PI / 180);

                if (vent.current_angle >= 2 * Math.PI) {
                    vent.current_angle -= 2 * Math.PI;
                }
            });

            for (let vent of vent_boxBackgrounds) {
                ctx.drawImage(vent_boxImg, vent.x, vent.y, vent.width, vent.height);

                ctx.save();

                ctx.translate(vent.x + vent.width / 2, vent.y + vent.height / 2);

                ctx.rotate(vent.current_angle);
                ctx.drawImage(screwImg, -vent.width / 2, -vent.height / 2, vent.width, vent.height);
                ctx.restore();
            }

            ctx.restore()
        }

        //Отрсиовка изображения телевизора
        function drawAnimatedImage(arr, x, y, width, height, factor, changespeed) {
            if (!factor) {
                factor = 1;
            }
            if (!changespeed) {
                changespeed = 1;
            }

            ctx.save();

            if (!!arr[Math.round(Date.now() / changespeed) % arr.length]) {
                ctx.drawImage(arr[Math.round(Date.now() / changespeed) % arr.length], x, y, width, height);
            }

            ctx.restore();
        }

        let waitingWhite_noise = [];
        let waitingDoom = [];

        for (var i = 0; i < white_noise.length; i++) {
            waitingWhite_noise[i] = new Image();
            waitingWhite_noise[i].src = white_noise[i];
        }
        for (var i = 0; i < doom.length; i++) {
            waitingDoom[i] = new Image();
            waitingDoom[i].src = doom[i];
        }

        function yop(tv) {
            if (tv.strength >= 15) {
                drawAnimatedImage(waitingDoom, tv.x, tv.y + 2, tv.width - 10, tv.height - 2, 1, 60)
            } else if (tv.strength < 15 && tv.strength > 0) {
                drawAnimatedImage(waitingWhite_noise, tv.x + 2, tv.y + 2, tv.width - 10, tv.height - 2, 1, 60)
            }
        }


        //Отрисовка ламп
        function drawLamps() {

            for (const lamp of roofLamps_1) {

                if (lamp.state == "on") {
                    ctx.drawImage(roofLamp_1Img, lamp.x, lamp.y, lamp.width, lamp.height);

                    drawLampGlow(ctx, lamp);
                } else {
                    ctx.drawImage(roofLamp_1_offImg, lamp.x, lamp.y, lamp.width, lamp.height);
                }
            }

            for (const lamp of roofLamps_2) {

                if (lamp.state == "on") {
                    ctx.drawImage(roofLamp_2Img, lamp.x, lamp.y, lamp.width, lamp.height);

                    drawLampGlowLamp_2(ctx, lamp);
                } else {
                    ctx.drawImage(roofLamp_2OffImg, lamp.x, lamp.y, lamp.width, lamp.height);
                }

            }

            for (const door of doorWays) {
                drawLightDoorWay(ctx, door);
            }

        }

        // Создание единой системы веревок с платформой
        function createRopeSystem(wiresGroup1, wiresGroup2, platformMass, platformWidth, gravity = 40.0) {
            let masses = [];
            let lengths = []; // lengths[i] - длина связи между i-1 и i
            let pos = [];
            let prevPos = [];
            let vel = [];

            // --- Построение первой веревки (левая) ---
            let startX = wiresGroup1[0].x;
            let startY = wiresGroup1[0].y;

            // Верхняя точка крепления (неподвижная)
            masses.push(0);
            lengths.push(0.0);
            pos.push({ x: startX, y: startY });
            prevPos.push({ x: startX, y: startY });
            vel.push({ x: 0, y: 0 });

            let currentX = startX;
            let currentY = startY;

            // Начальный угол
            let initAngle = 3.5;

            for (let wire of wiresGroup1) {
                let segLength = wire.height;
                let mass = wire.masses;       // масса звена
                let angle = initAngle;

                currentX += segLength * Math.sin(angle);
                currentY += segLength * -Math.cos(angle);

                masses.push(mass);
                lengths.push(segLength);
                pos.push({ x: currentX, y: currentY });
                prevPos.push({ x: currentX, y: currentY });
                vel.push({ x: 0, y: 0 });
            }

            // Последняя точка первой веревки становится левым краем платформы
            let leftIndex = masses.length - 1;
            masses[leftIndex] = platformMass / 2;

            // --- Построение второй веревки (правая) ---
            startX = wiresGroup2[0].x;
            startY = wiresGroup2[0].y;

            masses.push(0);
            lengths.push(0.0);
            pos.push({ x: startX, y: startY });
            prevPos.push({ x: startX, y: startY });
            vel.push({ x: 0, y: 0 });

            currentX = startX;
            currentY = startY;

            for (let wire of wiresGroup2) {
                let segLength = wire.height;
                let mass = wire.masses;
                let angle = initAngle;

                currentX += segLength * Math.sin(angle);
                currentY += segLength * -Math.cos(angle);

                masses.push(mass);
                lengths.push(segLength);
                pos.push({ x: currentX, y: currentY });
                prevPos.push({ x: currentX, y: currentY });
                vel.push({ x: 0, y: 0 });
            }

            // Последняя точка второй веревки — правый край платформы
            let rightIndex = masses.length - 1;
            masses[rightIndex] = platformMass / 2;

            // Дополнительная связь (жёсткая платформа) между левой и правой точками
            let extraConstraints = [{
                i: leftIndex,
                j: rightIndex,
                length: platformWidth
            }];

            // Объект системы
            return {
                masses, lengths, pos, prevPos, vel, extraConstraints,
                leftIndex, rightIndex,
                gravity,

                applyForce(massIndex, fx, fy, dt) {
                    if (massIndex <= 0 || massIndex >= this.masses.length) return;
                    if (this.masses[massIndex] <= 0) return; // Неподвижные точки игнорируем

                    const ax = fx / this.masses[massIndex];
                    const ay = fy / this.masses[massIndex];

                    this.vel[massIndex].x += ax * dt;
                    this.vel[massIndex].y += ay * dt;
                },

                getClosestMassIndex(targetX, targetY, maxDist = 50) {
                    let minDist = maxDist * maxDist;
                    let closestIndex = -1;

                    for (let i = 1; i < this.pos.length; i++) {
                        const dx = this.pos[i].x - targetX;
                        const dy = this.pos[i].y - targetY;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < minDist) {
                            minDist = distSq;
                            closestIndex = i;
                        }
                    }
                    return closestIndex;
                },

                simulate(dt, iterations = 10, damping = 0.995) {
                    // Интеграция Верле (только для подвижных точек)
                    for (let i = 1; i < this.masses.length; i++) {
                        if (this.masses[i] > 0) {
                            this.vel[i].y += dt * this.gravity;
                            this.prevPos[i].x = this.pos[i].x;
                            this.prevPos[i].y = this.pos[i].y;
                            this.pos[i].x += this.vel[i].x * dt;
                            this.pos[i].y += this.vel[i].y * dt;
                        } else {
                            this.prevPos[i].x = this.pos[i].x;
                            this.prevPos[i].y = this.pos[i].y;
                        }
                    }

                    for (let iter = 0; iter < iterations; iter++) {
                        // Последовательные связи (верёвки)
                        for (let i = 1; i < this.masses.length; i++) {
                            if (this.lengths[i] === 0) continue;

                            const dx = this.pos[i].x - this.pos[i - 1].x;
                            const dy = this.pos[i].y - this.pos[i - 1].y;
                            const d = Math.sqrt(dx * dx + dy * dy);
                            if (d < 1e-6) continue;

                            const w0 = this.masses[i - 1] > 0 ? 1 / this.masses[i - 1] : 0;
                            const w1 = this.masses[i] > 0 ? 1 / this.masses[i] : 0;
                            const corr = (this.lengths[i] - d) / d / (w0 + w1 + 1e-9);

                            if (w0 > 0) {
                                this.pos[i - 1].x -= w0 * corr * dx;
                                this.pos[i - 1].y -= w0 * corr * dy;
                            }
                            if (w1 > 0) {
                                this.pos[i].x += w1 * corr * dx;
                                this.pos[i].y += w1 * corr * dy;
                            }
                        }

                        // Дополнительные связи (платформа)
                        for (let c of this.extraConstraints) {
                            const dx = this.pos[c.j].x - this.pos[c.i].x;
                            const dy = this.pos[c.j].y - this.pos[c.i].y;
                            const d = Math.sqrt(dx * dx + dy * dy);
                            if (d < 1e-6) continue;

                            const w0 = this.masses[c.i] > 0 ? 1 / this.masses[c.i] : 0;
                            const w1 = this.masses[c.j] > 0 ? 1 / this.masses[c.j] : 0;
                            const corr = (c.length - d) / d / (w0 + w1 + 1e-9);

                            if (w0 > 0) {
                                this.pos[c.i].x -= w0 * corr * dx;
                                this.pos[c.i].y -= w0 * corr * dy;
                            }
                            if (w1 > 0) {
                                this.pos[c.j].x += w1 * corr * dx;
                                this.pos[c.j].y += w1 * corr * dy;
                            }
                        }
                    }

                    let totalMass = 0;
                    let vx = 0, vy = 0;

                    // Обновление скоростей и применение демпфирования
                    for (let i = 1; i < this.masses.length; i++) {
                        if (this.masses[i] > 0) {
                            this.vel[i].x = (this.pos[i].x - this.prevPos[i].x) / dt;
                            this.vel[i].y = (this.pos[i].y - this.prevPos[i].y) / dt;

                            totalMass += this.masses[i];
                            vx += this.vel[i].x * this.masses[i];
                            vy += this.vel[i].y * this.masses[i];

                            // Демпфирование (вязкое затухание)
                            this.vel[i].x *= damping;
                            this.vel[i].y *= damping;
                        }
                    }

                    if (totalMass > 0) {
                        const vxAvg = vx / totalMass;
                        const vyAvg = vy / totalMass;
                        this.speedPlatform = Math.sqrt(vxAvg * vxAvg + vyAvg * vyAvg);
                    }
                },

                draw(ctx, wireTexture, platformTexture) {
                    // Рисуем все сегменты верёвок
                    for (let i = 1; i < this.masses.length; i++) {
                        if (this.lengths[i] === 0) continue;

                        const start = this.pos[i - 1];
                        const end = this.pos[i];
                        const dx = end.x - start.x;
                        const dy = end.y - start.y;
                        const angle = Math.atan2(dy, -dx);

                        const centerX = (start.x + end.x) / 2;
                        const centerY = (start.y + end.y) / 2;

                        ctx.save();
                        ctx.translate(centerX, centerY);
                        ctx.rotate(-angle);

                        const textureWidth = metalWires[0].width;
                        const textureHeight = metalWires[0].height;

                        ctx.drawImage(
                            wireTexture,
                            -textureHeight / 2,
                            -textureWidth / 2,
                            textureHeight,
                            textureWidth
                        );
                        ctx.restore();
                    }

                    // Рисуем платформу
                    const left = this.pos[this.leftIndex];
                    const right = this.pos[this.rightIndex];
                    const dx = right.x - left.x;
                    const dy = right.y - left.y;
                    const platformAngle = Math.atan2(dy, dx);
                    const platformLength = Math.sqrt(dx * dx + dy * dy);
                    const platformHeight = 20;

                    Object.assign(obstacles.find(obst => obst.type == "metalPlatform"), {
                        width: platformLength,
                        height: platformHeight,
                        x: left.x,
                        y: right.y - platformHeight / 2,
                        vx: dx,
                        vy: dy,
                        speedPlatform: this.speedPlatform,
                    });

                    ctx.save();
                    ctx.translate((left.x + right.x) / 2, (left.y + right.y) / 2);
                    ctx.rotate(platformAngle);
                    ctx.drawImage(
                        platformTexture,
                        -platformLength / 2,
                        -platformHeight / 2,
                        platformLength,
                        platformHeight
                    );
                    ctx.restore();
                }
            };

        }

        function handleProjectileHit(hitX, hitY, vx, vy, mass) {

            // 1. Проверяем попадание в платформу
            const platformHit = checkPlatformHit(hitX, hitY);

            if (platformHit.hit) {
                // Попадание в платформу - распределяем силу между точками подвеса
                applyForceToPlatform(platformHit, vx, vy, mass);
                return;
            }
        }

        //  Проверяет попадание в платформу
        function checkPlatformHit(hitX, hitY) {
            const system = simulation.system;
            const left = system.pos[system.leftIndex];
            const right = system.pos[system.rightIndex];

            // Вычисляем расстояние от точки до отрезка платформы
            const distance = pointToLineSegmentDistance(hitX, hitY, left.x, left.y, right.x, right.y);
            // Определяем относительную позицию попадания вдоль платформы (0..1)
            const t = getProjectionParameter(hitX, hitY, left.x, left.y, right.x, right.y);
            return {
                hit: true,
                distance: distance,
                t: Math.max(0, Math.min(1, t)), // Параметр 0..1 (0 = левый край, 1 = правый)
                leftPos: left,
                rightPos: right
            };
        }

        //Применяет силу к платформе с учетом точки попадания
        function applyForceToPlatform(platformHit, bulletVx, bulletVy, bulletMass) {
            const system = simulation.system;

            // Расчет импульса от пули
            const bulletSpeed = Math.sqrt(bulletVx * bulletVx + bulletVy * bulletVy);
            const impactForce = bulletMass * bulletSpeed * 5; // Коэффициент усиления для заметности

            // Направление силы (в направлении движения пули)
            const forceAngle = Math.atan2(bulletVy, bulletVx);
            const fx = Math.cos(forceAngle) * impactForce;
            const fy = Math.sin(forceAngle) * impactForce;

            // Распределяем силу между левой и правой точками подвеса
            // в зависимости от места попадания (t = 0..1)
            const t = platformHit.t;

            // Левая точка получает больше силы при попадании ближе к левому краю
            const leftForceMultiplier = 1.0 - t;
            const rightForceMultiplier = t;

            // Дополнительный вертикальный импульс для имитации "подбрасывания" платформы
            const upwardBonus = -Math.abs(fy) * 0.3; // Небольшой подброс вверх

            // Применяем силы к точкам подвеса платформы
            system.applyForce(system.leftIndex,
                fx * leftForceMultiplier,
                fy * leftForceMultiplier + upwardBonus * leftForceMultiplier,
                simulation.dt
            );

            system.applyForce(system.rightIndex,
                fx * rightForceMultiplier,
                fy * rightForceMultiplier + upwardBonus * rightForceMultiplier,
                simulation.dt
            );
        }


        //   Вспомогательная функция: расстояние от точки до отрезка
        function pointToLineSegmentDistance(px, py, x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const lengthSquared = dx * dx + dy * dy;

            if (lengthSquared === 0) {
                return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
            }

            let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
            t = Math.max(0, Math.min(1, t));

            const projX = x1 + t * dx;
            const projY = y1 + t * dy;

            return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
        }


        // Вспомогательная функция: параметр проекции точки на отрезок (0..1)
        function getProjectionParameter(px, py, x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const lengthSquared = dx * dx + dy * dy;

            if (lengthSquared === 0) return 0;

            return ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
        }

        // --- Инициализация ---
        const wires1 = metalWires.filter(wire => wire.x === metalWires[0].x);
        const wires2 = metalWires.filter(wire => wire.x !== metalWires[0].x);

        // Параметры платформы
        const platformMass = 50.0; // общая масса платформы
        const platformWidth = wires2[0].x - wires1[0].x; // расстояние между точками крепления

        obstacles.push({
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            type: "metalPlatform",
            intObst: true,
            speedPlatform: 0
        })

        // Создаём единую систему с гравитацией 40
        const system = createRopeSystem(wires1, wires2, platformMass, platformWidth, 40.0);

        // Параметры симуляции
        const simulation = {
            dt: 0.08,
            numSubSteps: 5,
            system: system
        };

        // Функция симуляции с улучшенным затуханием
        function simulateUnified() {
            const sdt = simulation.dt / simulation.numSubSteps;
            for (let step = 0; step < simulation.numSubSteps; step++) {
                simulation.system.simulate(sdt, 5, 1);
            }
        }

        // Функция отрисовки
        function drawUnified(ctx) {
            simulation.system.draw(ctx, metalWireImg, metalPlatformImg);
        }

        // Функция для рисования свечения лампы
        function drawLampGlow(ctx, lamp) {
            // Центр лампы
            const centerX = lamp.x + lamp.width / 2;
            const centerY = lamp.y + lamp.height / 2;

            // Создаем радиальный градиент для свечения
            // Внутренний радиус - 30% от размера лампы
            const innerRadius = Math.min(lamp.width, lamp.height) * 1.2;
            // Внешний радиус - в 4 раза больше внутреннего (можно регулировать)
            const outerRadius = innerRadius * 10;

            const gradient = ctx.createRadialGradient(
                centerX, centerY, innerRadius,
                centerX, centerY, outerRadius
            );

            // Добавляем цветовые остановки, имитирующие CSS box-shadow
            gradient.addColorStop(0, 'rgba(255, 253, 253, 0.8)');     // Яркий центр
            gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.4)');  // Белое свечение
            // gradient.addColorStop(0.3, 'rgba(255, 255, 0, 0.2)');    // Желтое свечение
            gradient.addColorStop(0.6, 'rgba(0, 255, 255, 0.1)');    // Голубое свечение
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');        // Прозрачный край

            // Сохраняем текущее состояние контекста
            ctx.save();

            // Устанавливаем глобальную прозрачность для всего свечения с эффектом мерцания
            ctx.globalAlpha = 0.6 + Math.random() * 0.1;

            // Рисуем свечение
            ctx.fillStyle = gradient;
            ctx.beginPath();

            ctx.ellipse(
                centerX, centerY,
                outerRadius * (lamp.width / lamp.height), // Радиус по X
                outerRadius,                              // Радиус по Y
                0, 0, Math.PI * 2
            );

            ctx.fill();

            ctx.restore();
        }

        function drawLampGlowLamp_2(ctx, lamp) {
            // Центр лампы
            const centerX = lamp.x + lamp.width / 2;
            const centerY = lamp.y + lamp.height / 1.5;

            // Создаем радиальный градиент для свечения
            const innerRadius = Math.min(lamp.width, lamp.height) * 0.4;
            // Внешний радиус - в 4 раза больше внутреннего (можно регулировать)
            const outerRadius = innerRadius * 10;

            const gradient = ctx.createRadialGradient(
                centerX, centerY, innerRadius,
                centerX, centerY, outerRadius
            );

            // Добавляем цветовые остановки, имитирующие CSS box-shadow
            gradient.addColorStop(0, 'rgba(255, 253, 253, 0.8)');     // Яркий центр
            gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.4)');  // Белое свечение
            gradient.addColorStop(0.6, 'rgba(0, 255, 255, 0.1)');    // Голубое свечение
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');        // Прозрачный край

            // Сохраняем текущее состояние контекста
            ctx.save();

            // Устанавливаем глобальную прозрачность для всего свечения (опционально)
            ctx.globalAlpha = 0.6 + Math.random() * 0.1;

            // Рисуем свечение
            ctx.fillStyle = gradient;
            ctx.beginPath();

            ctx.ellipse(
                centerX, centerY,
                outerRadius * (lamp.width / lamp.height), // Радиус по X
                outerRadius,                              // Радиус по Y
                0, 0, Math.PI * 2
            );

            ctx.fill();

            ctx.restore();
        }

        // Функция для рисования свечения дверного проема
        function drawLightDoorWay(ctx, doorWay) {
            let gradient = ctx.createLinearGradient(0, 0, 0, 0)
            const x1 = doorWay.position == "right" ? doorWay.x : doorWay.x + doorWay.width;
            const y1 = doorWay.y;
            const x2 = doorWay.position == "right" ? doorWay.x - 90 : doorWay.x + 90
            const y2 = doorWay.y + doorWay.height;
            const x3 = x1;
            const y3 = y2;

            gradient = ctx.createLinearGradient(
                x1, y1, x2, y2
            );

            // Добавляем цветовые остановки, имитирующие CSS box-shadow
            gradient.addColorStop(0, 'rgba(255, 253, 253, 0.8)');     // Яркий центр
            // gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.4)');  // Белое свечение
            gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.2)');    // Желтое свечение
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');        // Прозрачный крайф

            // Сохраняем текущее состояние контекста
            ctx.save();

            // Устанавливаем глобальную прозрачность для всего свечения
            ctx.globalAlpha = 0.6

            ctx.beginPath();

            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.closePath(); // Соединить последнюю точку с первой
            ctx.fillStyle = gradient;
            ctx.fill(); // Отрисовать залитый треугольник

            ctx.restore();
        }

        // Анимация погасания лампы с паузой на пике яркости
        function offLampAnimation(lamp) {

            // Центр лампы
            const centerX = lamp.x + lamp.width / 2;
            const centerY = lamp.y + lamp.height / 2;

            // Создаем радиальный градиент для свечения
            // Внутренний радиус - 30% от размера лампы
            const innerRadius = Math.min(lamp.width, lamp.height) * 1.2;
            // Внешний радиус - в 4 раза больше внутреннего
            const outerRadius = innerRadius * 10;

            const gradient = ctx.createRadialGradient(
                centerX, centerY, innerRadius,
                centerX, centerY, outerRadius
            );

            // Добавляем цветовые остановки, имитирующие CSS box-shadow
            gradient.addColorStop(0, 'rgba(255, 253, 253, 0.8)');    // Яркий центр
            gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.4)');  // Белое свечение
            gradient.addColorStop(0.6, 'rgba(0, 255, 255, 0.1)');    // Голубое свечение
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');        // Прозрачный край

            // Сохраняем текущее состояние контекста
            ctx.save();

            ctx.globalAlpha = 1;

            // Рисуем свечение
            ctx.fillStyle = gradient;
            ctx.beginPath();

            ctx.ellipse(
                centerX, centerY,
                outerRadius * (lamp.width / lamp.height), // Радиус по X
                outerRadius,                              // Радиус по Y
                0, 0, Math.PI * 2
            );

            ctx.fill();

            ctx.restore();

        }

        //Управление движением лифта при контакте с объектом
        // function motionUpDynamicObstacle(dynamicObstacle) {
        //     // Начинаем подъём
        //     const moveUpInterval = setInterval(() => {
        //         if (dynamicObstacle.y > dynamicObstacle.levelUp) {
        //             dynamicObstacle.y -= 1;
        //         } else {
        //             clearInterval(moveUpInterval);

        //             // Ждём 3 секунды и начинаем опускание
        //             setTimeout(() => {
        //                 const moveDownInterval = setInterval(() => {
        //                     if (dynamicObstacle.y < dynamicObstacle.levelDown) {
        //                         dynamicObstacle.y += 1;
        //                     } else {
        //                         clearInterval(moveDownInterval);
        //                         dynamicObstacle.worked = false;
        //                     }
        //                 }, 5); // Интервал для плавности опускания
        //             }, 2000);
        //         }
        //     }, 5); // Интервал для плавности подъёма
        // }

        //Управление движением лифта
        function motionDynamicObstacle() {
            for (let dynamicObstacle of obstacles) {
                if (dynamicObstacle.type == "dynamic_obstacles" && dynamicObstacle.motion == true) {
                    // Начинаем подъём
                    dynamicObstacle.motion = false
                    const moveUpInterval = setInterval(() => {
                        if (dynamicObstacle.y > dynamicObstacle.levelUp) {
                            dynamicObstacle.y -= dynamicObstacle.speed;
                        } else {
                            clearInterval(moveUpInterval);

                            // Начинаем опускание
                            const moveDownInterval = setInterval(() => {
                                if (dynamicObstacle.y < dynamicObstacle.levelDown) {
                                    dynamicObstacle.y += dynamicObstacle.speed;
                                } else {
                                    clearInterval(moveDownInterval);
                                    dynamicObstacle.motion = true
                                }
                            }, 5); // Интервал для плавности опускания
                        }
                    }, 5); // Интервал для плавности подъёма      
                }
            }
        }

        // Столкновение инт. объекта с другими объектами
        function updateObstacle() {
            for (let intObstacle of obstacles) {
                if (intObstacle.intObst == true) {
                    // Применяем гравитацию
                    if (intObstacle.gravity) {
                        intObstacle.velocity += intObstacle.gravity;
                        intObstacle.y += intObstacle.velocity;
                    }
                    for (let obstacle of obstacles) {
                        if (intObstacle !== obstacle) {
                            if (isCollidingObstacles(obstacle, intObstacle)) {

                                // Рассчитываем перекрытия по осям
                                const overlapX = Math.min(
                                    intObstacle.x + intObstacle.width - obstacle.x,
                                    obstacle.x + obstacle.width - intObstacle.x
                                );

                                const overlapY = Math.min(
                                    intObstacle.y + intObstacle.height - obstacle.y,
                                    obstacle.y + obstacle.height - intObstacle.y
                                );

                                if (intObstacle.type == "metalPlatform") {

                                    const hitX = obstacle.x;
                                    const hitY = obstacle.y + obstacle.height / 2;

                                    if (obstacle.intObst !== true) {
                                        handleProjectileHit(hitX, hitY, -intObstacle.vx, -intObstacle.vy, intObstacle.speedPlatform / 10);
                                    }
                                }
                                
                                if (obstacle.type == "metalPlatform") {

                                    const hitX = intObstacle.x;
                                    const hitY = intObstacle.y + intObstacle.height / 2;

                                    handleProjectileHit(hitX, hitY, 0, 500, intObstacle.lastVelocity * intObstacle.mass);

                                }


                                // Определяем направление столкновения
                                if (overlapX < overlapY) {
                                    // Горизонтальное столкновение
                                    if (intObstacle.x < obstacle.x) {
                                        // Слева
                                        intObstacle.x = obstacle.x - intObstacle.width;
                                    } else {
                                        // Справа
                                        intObstacle.x = obstacle.x + obstacle.width;
                                    }

                                } else {
                                    intObstacle.lastVelocity = intObstacle.velocity
                                    // Вертикальное столкновение
                                    if (intObstacle.y < obstacle.y) {
                                        // Сверху
                                        intObstacle.y = obstacle.y - intObstacle.height + 1;
                                        intObstacle.velocity = 0;
                                        if (obstacle.intObst == true) {
                                            if (intObstacle.touchObst !== obstacle) {
                                                intObstacle.touchObst = obstacle;
                                                intObstacle.positionOnPlatform = obstacle.x;
                                            }
                                            intObstacle.x += obstacle.x - intObstacle.positionOnPlatform;
                                        }
                                    } else {
                                        // Снизу
                                        intObstacle.y = obstacle.y + obstacle.height;
                                        intObstacle.velocity = intObstacle.gravity; // Отталкивание вниз
                                    }
                                }
                            }
                        }
                    }

                    //Обновляем позицию объекта с последним объектом
                    if (intObstacle.touchObst) {
                        updatePositionOnObst(intObstacle, intObstacle.touchObst)
                    }
                }
            }
        }

        //Враги
        function createEnemy(x, y) {
            return {
                x: x,
                y: y,
                width: 30,
                height: 60,
                head:
                {
                    x: 0,
                    y: 0,
                    width: 20,
                    height: 20
                },
                hp: 5,
                velocity: 0,
                gravity: 0.2,
                speed: 20,
                nextDecisionTime: 0,
                jumpPower: -7,
                isJumping: false,
                visionRange: 1000,
                attackRange: 700,
                current_position: 0,
                targetX: null,
                state: 'idle',
                jumpCooldown: 0,
                direction: 1,
                patrolPoints: [
                ],
                currentPatrolIndex: 0,
                lastGroundY: y
            };
        }

        function drawEnemies() {
            enemies.forEach(enemy => {
                ctx.fillStyle = 'red';
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

                // Рассчитываем параметры головы
                enemy.head.x = enemy.x + 3;
                enemy.head.y = enemy.y - 12;

                // Рисуем голову
                ctx.fillStyle = '#ffcccb';
                ctx.fillRect(enemy.head.x, enemy.head.y, enemy.head.width, enemy.head.height);

                // Отрисовка HP
                ctx.fillStyle = 'white';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                const textX = enemy.x + enemy.width / 2;
                const textY = enemy.y - 5;
                ctx.fillStyle = 'black';
                ctx.fillText(enemy.hp.toString(), textX, textY);
                ctx.fillStyle = 'white';
                ctx.fillText(enemy.hp.toString(), textX, textY);
            });
        }


        let enemyShotTime = performance.now();
        const enemyshotInterval = 500; // 100ms = 10 раз/сек
        //Стрельба противника по игроку
        function shootingEnemies() {
            const now = performance.now();
            if (now - enemyShotTime >= enemyshotInterval) {
                enemyShotTime = now;
                enemies.forEach(enemy => {
                    const distance = Math.sqrt((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2);
                    if (distance < enemy.attackRange) {

                        // Код создания пули
                        const startX = enemy.x + enemy.width / 2;
                        const startY = enemy.y + enemy.height / 2;

                        const dx = player.x - startX
                        const dy = player.y - startY

                        let angle = Math.atan2(dy, dx);

                        // Добавляем случайный разброс (5 градусов в радианах)
                        const maxSpreadRad = 5 * Math.PI / 180; // Конвертируем градусы в радианы
                        angle += (Math.random() - 0.5) * maxSpreadRad * 2; // Диапазон ±5 градусов

                        // Рассчитываем скорости
                        const speed = 15;
                        const velocityX = Math.cos(angle) * speed;
                        const velocityY = Math.sin(angle) * speed;

                        bullets.push({
                            x: startX + Math.cos(angle) * 20,
                            y: startY + Math.sin(angle) * 20,
                            velocityX: velocityX,
                            velocityY: velocityY,
                            angle: angle,
                        });
                    }
                })
            }
        }

        function updateEnemiesAI() {
            const now = performance.now();
            enemies.forEach(enemy => {
                // Физика и коллизии
                enemy.velocity += enemy.gravity;
                enemy.y += enemy.velocity;

                // Обновление последней позиции на земле
                if (isOnGround(enemy)) {
                    enemy.lastGroundY = enemy.y;
                }

                // Обработка коллизий с препятствиями
                for (let obstacle of obstacles) {
                    if (isCollidingObstacles(obstacle, enemy)) {
                        const overlapX = Math.min(
                            enemy.x + enemy.width - obstacle.x,
                            obstacle.x + obstacle.width - enemy.x
                        );

                        const overlapY = Math.min(
                            enemy.y + enemy.height - obstacle.y,
                            obstacle.y + obstacle.height - enemy.y
                        );

                        if (overlapX < overlapY) {
                            // Горизонтальное столкновение
                            if (enemy.x < obstacle.x) {
                                enemy.x = obstacle.x - enemy.width;
                            } else {
                                enemy.x = obstacle.x + obstacle.width;
                            }
                            enemy.velocityX = 0; // Останавливаем горизонтальное движение
                        } else {
                            // Вертикальное столкновение
                            if (enemy.y < obstacle.y) {
                                enemy.y = obstacle.y - enemy.height;
                                enemy.velocity = 0;
                                enemy.isJumping = false; // Используем новое свойство
                            } else {
                                enemy.y = obstacle.y + obstacle.height;
                                enemy.velocity = 0; // Сбрасываем скорость вместо применения гравитации
                            }
                        }
                    }
                }

                // Границы холста
                if (enemy.y > fieldHeight - enemy.height) {
                    enemy.y = fieldHeight - enemy.height;
                    enemy.velocity = 0;
                }
                if (enemy.x > fieldWidth - enemy.width) enemy.x = fieldWidth - enemy.width;
                if (enemy.x < 0) enemy.x = 0;

                if (enemy.targetX !== null) {
                    const dx = enemy.targetX - enemy.x;
                    const moveStep = Math.sign(dx) * enemy.speed;

                    // Плавное движение с инерцией
                    enemy.x += moveStep * 0.1;

                    // Обновляем направление
                    enemy.direction = Math.sign(dx);
                }

                // Логика AI
                const dxToPlayer = player.x - enemy.x;
                const distanceToPlayer = Math.abs(dxToPlayer);
                const canSeePlayer = isPlayerVisible(enemy) && distanceToPlayer < enemy.visionRange;

                if (canSeePlayer) {
                    enemy.state = distanceToPlayer < enemy.attackRange ? 'attack' : 'chase';
                } else {
                    enemy.state = 'idle';
                }

                // Принятие решений
                if (now > enemy.nextDecisionTime) {
                    switch (enemy.state) {
                        case 'chase':
                            smartChase(enemy);
                            break;
                        case 'attack':
                            tacticalAttack(enemy);
                            break;
                        default:
                            patrolBehavior(enemy);
                    }
                    enemy.nextDecisionTime = now + 800 + Math.random() * 800;
                }

                for (let grenade of grenades) {
                    const optimalDistance = 250;
                    const currentDistance = Math.abs(grenade.x - enemy.x);

                    if (currentDistance < optimalDistance) {
                        // Плавное отступление
                        const retreatDirection = grenade.x > enemy.x ? -1 : 1;
                        enemy.targetX = enemy.x + retreatDirection * enemy.speed * 3; // Уменьшаем множитель
                    }
                }
                smartJumping(enemy);
            });
        }

        function isPlayerVisible(enemy) {
            // Простая проверка видимости через луч
            const steps = 20;
            const stepX = (player.x - enemy.x) / steps;
            const stepY = (player.y - enemy.y) / steps;

            for (let i = 0; i < steps; i++) {
                const checkX = enemy.x + stepX * i;
                const checkY = enemy.y + stepY * i;

                for (const obstacle of obstacles) {
                    if (checkX > obstacle.x && checkX < obstacle.x + obstacle.width &&
                        checkY > obstacle.y && checkY < obstacle.y + obstacle.height) {
                        return false;
                    }
                }
            }
            return true;
        }

        function smartChase(enemy) {
            const path = findPath(enemy);
            if (path.length > 0) {
                enemy.targetX = path[0].x;
            } else {
                enemy.targetX = player.x;
            }

            // Прыжок через препятствия
            if (enemy.jumpCooldown <= 0 && hasObstacleInFront(enemy)) {
                enemy.velocity = enemy.jumpPower;
                enemy.jumpCooldown = 1000;
            }
        }

        // Патрулирование
        function patrolBehavior(enemy) {
            if (enemy.patrolPoints.length == 0) {
                // Инициализация точек патрулирования
                enemy.patrolPoints = [
                    {
                        x: enemy.x + (Math.random() * 1000 - 500),
                        y: enemy.y
                    },
                    {
                        x: enemy.x + (Math.random() * 1000 - 500),
                        y: enemy.y
                    }
                ];
                enemy.currentPatrolIndex = 0;
            }
            const targetPoint = enemy.patrolPoints[enemy.currentPatrolIndex];

            if (Math.abs(enemy.x - targetPoint.x) < 10) {
                enemy.currentPatrolIndex = (enemy.currentPatrolIndex + 1) % 2;
                enemy.nextDecisionTime += 2000; // Пауза на точке
            }

            if (enemy.current_position == (enemy.targetX - enemy.x)) {
                if (enemy.targetX < enemy.x) {
                    enemy.targetX = enemy.x + 500
                } else {
                    enemy.targetX = enemy.x - 500
                }
                enemy.patrolPoints = [
                    {
                        x: enemy.x + (Math.random() * 1000 - 500),
                        y: enemy.y
                    },
                    {
                        x: enemy.x + (Math.random() * 1000 - 500),
                        y: enemy.y
                    }
                ];
                enemy.currentPatrolIndex = 0;
            }
            enemy.current_position = enemy.targetX - enemy.x

        }

        function tacticalAttack(enemy) {
            shootingEnemies()
            const optimalDistance = 250;
            const currentDistance = Math.abs(player.x - enemy.x);

            if (currentDistance < optimalDistance) {
                // Плавное отступление
                const retreatDirection = player.x > enemy.x ? -1 : 1;
                enemy.targetX = enemy.x + retreatDirection * enemy.speed * 3; // Уменьшаем множитель
            } else {
                smartChase(enemy);
            }
        }

        // Улучшенная логика прыжков
        function smartJumping(enemy) {
            if (enemy.jumpCooldown > 0) {
                enemy.jumpCooldown -= 16;
                return;
            }

            if (isOnGround(enemy) && hasObstacleInFront(enemy)) {
                enemy.velocity = enemy.jumpPower;
                enemy.jumpCooldown = 1000;
                enemy.isJumping = true;
            }
        }

        function hasObstacleInFront(enemy) {
            // Определяем передний край врага в зависимости от направления
            const frontEdge = enemy.direction > 0
                ? enemy.x + enemy.width   // Движение вправо: передний край справа
                : enemy.x;                // Движение влево: передний край слева

            // Точка проверки (на 60px впереди от переднего края в направлении движения)
            const checkX = frontEdge + enemy.direction * 60;

            const headY = enemy.y;
            const feetY = enemy.y + enemy.height;

            return obstacles.some(obstacle => {
                // Проверяем, что точка checkX находится внутри препятствия по X
                const isInFront = checkX >= obstacle.x && checkX <= obstacle.x + obstacle.width;

                // Проверяем пересечение по высоте (препятствие в пределах роста врага)
                const isInPath = obstacle.y < feetY && obstacle.y + obstacle.height > headY;

                // Исключаем платформы под ногами
                const isGround = feetY <= obstacle.y + 5 && feetY >= obstacle.y;

                return isInFront && isInPath && !isGround;
            });
        }

        function isOnGround(enemy) {
            const tolerance = 5;
            return obstacles.some(obstacle =>
                Math.abs(enemy.y + enemy.height - obstacle.y) <= tolerance &&
                enemy.x + enemy.width > obstacle.x &&
                enemy.x < obstacle.x + obstacle.width
            ) || enemy.y + enemy.height >= fieldHeight - tolerance;
        }

        // Добавляем заглушку для findPath
        function findPath(enemy) {
            // Упрощенная реализация поиска пути
            return []; // В реальной реализации должен возвращать массив точек пути
        }



        // Обработчики нажатия клавиш
        const keysPressed = {
            KeyA: false,
            KeyD: false,
            KeyW: false,
            KeyS: false,
            KeyR: false,
            KeyG: false,
            Digit1: false,
            Digit2: false,
            Digit3: false,
            Digit4: false,
            Digit5: false

        };

        let isRKeyPressed = false;

        document.addEventListener('keyup', (event) => {
            if (keysPressed.hasOwnProperty(event.code)) {
                keysPressed[event.code] = false;
            }
        });

        document.addEventListener('keydown', (event) => {
            if (keysPressed.hasOwnProperty(event.code)) {
                keysPressed[event.code] = true;
            }
            //Пауза/Снятие с паузы
            if (event.key === 'Escape') {
                getPause()
            }

        });

        document.addEventListener('keyup', (event) => {
            if (event.key === '~' || event.key === '`' || event.key === 'ё') {
                debbug_mode == true ? debbug_mode = false : debbug_mode = true
            }
        });

        let rect = 0;
        let mouseX = player.x + 100
        let mouseY = player.y + 20
        let isMouseDown = false;
        let actionInterval;

        canvas.addEventListener('mousedown', (event) => {
            isMouseDown = true;
        });

        document.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        canvas.addEventListener('mousemove', (event) => {
            clearInterval(actionInterval);

            const repeatAction = () => {

                rect = canvas.getBoundingClientRect();
                mouseX = (event.clientX - rect.left) + camera.x;
                mouseY = (event.clientY - rect.top) + camera.y;

                if (mouseX > player.x + 15) player.facingRight = true
                if (mouseX < player.x + 15) player.facingRight = false

            };
            repeatAction();
            actionInterval = setInterval(repeatAction, 10);
        });

        let progressGL = true

        function getPause() {
            const pause = document.getElementById('pause_menu');
            if (progressGL == true) {
                progressGL = false
                pause.style.display = "flex";
            } else {
                progressGL = true
                pause.style.display = "none";
                gameLoop()
            }
        }

        let stopGame = false;

        //пауза
        document.getElementById('continueBtn').addEventListener('click', () => {
            getPause()
        });

        //рестарт
        document.getElementById('restartBtn').addEventListener('click', () => {
            stopGame = true
            startGame()
        });

        //Выход в меню
        document.getElementById('exitMenuBtn').addEventListener('click', () => {
            stopGame = true
            const main = document.getElementById('main_menu');
            main.style.display = "flex";
            const canvas = document.getElementById('gameCanvas');
            canvas.style.display = "none";
            const pause = document.getElementById('pause_menu');
            pause.style.display = "none";
        });

        //Логика расчета пули
        let bullets = [];

        function createBullet() {
            // Получаем позицию дула оружия
            const muzzlePoint = getMuzzlePoint();
            const startX = muzzlePoint.x;
            const startY = muzzlePoint.y;

            const speed = current_gun.speed_bullet;

            if (current_gun.capacity > 0) {
                current_gun.capacity--;
                shooting = true;

                if (spread < current_gun.spreadRad) {
                    spread += 0.4;
                }

                const maxSpreadRad = spread * Math.PI / 180;

                for (let i = 0; i < current_gun.pellets; i++) {
                    let angle = muzzlePoint.angle
                    angle += (Math.random() - 0.5) * maxSpreadRad * 2;

                    bullets.push({
                        x: startX,
                        y: startY,
                        velocityX: Math.cos(angle) * speed,
                        velocityY: Math.sin(angle) * speed,
                        angle: angle,
                    });
                    // playShootSound();
                }
                calcCapacity(current_gun);
            } else {
                shooting = false;
            }
        }

        function drawBullets() {
            ctx.fillStyle = 'Yellow';
            bullets.forEach(bullet => {
                ctx.save(); // Сохраняем текущий контекст
                ctx.translate(bullet.x, bullet.y); // Переносим начало координат
                ctx.rotate(bullet.angle + Math.PI / 2); // Поворачиваем контекст

                // Рисуем прямоугольник относительно новых координат
                ctx.fillRect(
                    -1.5, // Смещение по X для центрирования
                    -15,  // Смещение по Y чтобы пуля была перед игроком
                    3, 15
                );
                ctx.restore(); // Восстанавливаем контекст
            });
        }

        function updateBullets(obstacles, enemies) {
            bullets.forEach((bullet, index) => {
                // Обновляем позицию
                bullet.x += bullet.velocityX;
                bullet.y += bullet.velocityY;
                bullet.angle = Math.atan2(bullet.velocityY, bullet.velocityX);

                // Проверяем выход за границы canvas
                if (bullet.x < 0 || bullet.x > fieldWidth ||
                    bullet.y < 0 || bullet.y > fieldHeight) {
                    bullets.splice(index, 1);
                    return
                }

                // Проверяем сталкивается ли пуля с препятствием
                for (let obstacle of obstacles) {
                    if (isCollidingBullet(bullet, obstacle)) {
                        // Рассчитываем перекрытия по осям
                        const overlapX = Math.min(
                            bullet.x - obstacle.x,
                            obstacle.x + obstacle.width - bullet.x
                        );

                        const overlapY = Math.min(
                            bullet.y - obstacle.y,
                            obstacle.y + obstacle.height - bullet.y
                        );

                        const minOverlap = Math.min(overlapX, overlapY);
                        let handled = false;

                        //Уменьшаем прочность объекта (при наличии)
                        if (obstacle.strength) {
                            obstacle.strength -= current_gun.damage
                            if (obstacle.strength <= 0) {
                                const indexObstcl = obstacles.findIndex(obst => obst === obstacle);
                                if (indexObstcl !== -1 && obstacle.type !== "tv") {
                                    obstacles.splice(indexObstcl, 1); //Удаляем объект из массива
                                    switch (obstacle.type) { //Обрабатываем действие в зависимости от типа объекта
                                        case "woodBox":
                                            lootSpawnRandom(obstacle.x, obstacle.y)
                                            break;
                                        case "expBarrel":
                                            createExplosion(obstacle.x, obstacle.y);
                                            break;
                                    }
                                }
                            }
                        }

                        if (obstacle.type == "metalPlatform") {
                            const hitX = bullet.x;
                            const hitY = bullet.y;
                            const bulletSpeed = 500; // скорость пули в пикселях/сек
                            const vx = Math.cos(bullet.angle) * bulletSpeed;
                            const vy = Math.sin(bullet.angle) * bulletSpeed;
                            const mass = 1.0;

                            // Обрабатываем попадание
                            handleProjectileHit(hitX, hitY, vx, vy, mass);
                        }

                        // Обрабатываем горизонтальные столкновения (левая/правая сторона)
                        if (overlapX === minOverlap) {
                            if (bullet.x < obstacle.x) {
                                if ((bullet.angle > 0.9 && bullet.angle < 1.5) ||
                                    (bullet.angle < -0.9 && bullet.angle > -1.5)) {
                                    bullet.velocityX = -bullet.velocityX;
                                    bullet.angle = Math.atan2(bullet.velocityY, bullet.velocityX);
                                    handled = true;
                                }
                                if (obstacle.intObst == true) {
                                    obstacle.x = obstacle.x + (3 - obstacle.mass > 0 ? 3 - obstacle.mass : 0.2) //Движение объекта при столкновении с пулей
                                }
                            } else {
                                if ((bullet.angle > 1.5 && bullet.angle < 2.0) ||
                                    (bullet.angle < -1.5 && bullet.angle > -2.0)) {
                                    bullet.velocityX = -bullet.velocityX;
                                    bullet.angle = Math.atan2(bullet.velocityY, bullet.velocityX);
                                    handled = true;
                                }
                                if (obstacle.intObst == true) {
                                    obstacle.x = obstacle.x - (3 - obstacle.mass > 0 ? 3 - obstacle.mass : 0.2) //Движение объекта при столкновении с пулей
                                }
                            }
                        }

                        // Если не обработано, пробуем вертикальные столкновения
                        if (!handled && overlapY === minOverlap) {
                            if (bullet.y < obstacle.y) {
                                if (bullet.angle > 2.9 || bullet.angle < 0.2) {
                                    bullet.velocityY = -bullet.velocityY;
                                    bullet.angle = Math.atan2(bullet.velocityY, bullet.velocityX);
                                    handled = true;
                                }
                            } else {
                                if (bullet.angle < -2.9 || (bullet.angle > -0.2 && bullet.angle < 0)) {
                                    bullet.velocityY = -bullet.velocityY;
                                    bullet.angle = Math.atan2(bullet.velocityY, bullet.velocityX);
                                    handled = true;
                                }
                            }
                        }

                        if (!handled) {
                            bullets.splice(index, 1);
                            return
                        }
                    }
                }

                // Проверяем сталкивается ли пуля с лампой
                roofLamps_1.forEach((roofLamp) => {

                    if (isCollidingBullet(bullet, roofLamp) && roofLamp.state == "on") {

                        offLampAnimation(roofLamp)

                        roofLamp.state = "off";

                        let handled = false;

                        if (!handled) {
                            bullets.splice(index, 1);
                            return
                        }

                    }

                });

                roofLamps_2.forEach((roofLamp) => {

                    if (isCollidingBullet(bullet, roofLamp) && roofLamp.state == "on") {

                        offLampAnimation(roofLamp)

                        roofLamp.state = "off";

                        let handled = false;

                        if (!handled) {
                            bullets.splice(index, 1);
                            return
                        }

                    }

                });

                // Проверяем сталкивается ли пуля с телом противника
                enemies.forEach((enemy, indexEnemy) => {
                    //столкновение с телом
                    if (isCollidingBullet(bullet, enemy)) {
                        bullets.splice(index, 1);
                        enemy.hp = enemy.hp - current_gun.damage
                        if (enemy.hp <= 0) {
                            enemies.splice(indexEnemy, 1)
                            score++
                        }
                    }

                    //столкновение с головой противника
                    if (isCollidingBullet(bullet, enemy.head)) {
                        bullets.splice(index, 1);
                        // enemy.hp = enemy.hp - current_gun.damage
                        // if (enemy.hp <= 0) {
                        enemies.splice(indexEnemy, 1)
                        score++
                        // }
                    }
                });

                // Проверяем сталкивается ли пуля с игроком
                if (isCollidingBullet(bullet, player.torso)) {
                    bullets.splice(index, 1);
                    //временно   player.hp--
                    if (player.hp <= 0) {
                        player.splice()
                    }
                }

                // Проверяем сталкивается ли пуля с ногами игрока
                if (isCollidingBullet(bullet, player.legsZone)) {
                    bullets.splice(index, 1);
                    //временно   player.hp--
                    if (player.hp <= 0) {
                        player.splice()
                    }
                }

                //столкновение с головой игрока
                if (isCollidingBullet(bullet, player.head)) {
                    bullets.splice(index, 1);
                    //временно   player.hp--
                    if (player.hp <= 0) {
                        player.splice()
                    }
                }
            });
        }

        //Получаем коллизию пули и объекта
        function isCollidingBullet(bullet, object) {
            return bullet.x < object.x + object.width + 10 &&
                bullet.x + bullet.velocityX > object.x &&
                bullet.y < object.y + object.height + 10 &&
                bullet.y + bullet.velocityY > object.y;
        }

        //Получаем коллизию объекта и препятствия
        function isCollidingObstacles(obstacle, object) {
            return object.x < obstacle.x + obstacle.width &&
                object.x + object.width > obstacle.x &&
                object.y < obstacle.y + obstacle.height &&
                object.y + object.height > obstacle.y;
        }

        function lootSpawnRandom(x, y) {
            const randomSpawn = Math.floor(Math.random() * 100);
            if (randomSpawn < 50) {
                const random = Math.floor(Math.random() * 100) + 1;

                if (random <= 40) { //спаун патронов
                    obstacles.push({
                        width: 28 + 28 / 2,
                        height: 28,
                        x: x,
                        y: y,
                        gravity: 0.2,
                        velocity: 0,
                        type: "ammo",
                        mass: 0.7,
                        intObst: true,
                        positionOnPlatform: 0,
                        touchObst: 0,
                    });

                } else if (random <= 80) { //спаун аптечки
                    obstacles.push({
                        width: 28,
                        height: 28,
                        x: x,
                        y: y,
                        gravity: 0.2,
                        velocity: 0,
                        type: "medkit",
                        mass: 0.5,
                        intObst: true,
                        positionOnPlatform: 0,
                        touchObst: 0,
                    });

                } else { //спаун денег
                    money.push({
                        width: 28,
                        height: 20,
                        x: x,
                        y: y + 10,
                    });

                }

            }
        }

        function gameLoop() {
            try {
                // Расчет FPS
                if (Date.now() - lastFPSCheck >= 1000) {
                    fps = frameCount;
                    frameCount = 0;
                    lastFPSCheck = Date.now();
                }
                frameCount++;
                ctx.clearRect(0, 0, fieldWidth, fieldHeight);
                // Сначала обновляем состояние

                player.update(obstacles, transitionBlocks);
                updateEnemiesAI();

                // Затем отрисовываем
                updateCamera();
                ctx.save();
                ctx.translate(-camera.x, -camera.y);

                drawBackground();

                simulateUnified();

                drawLamps();
                drawEnemies();
                player.show();
                drawObstacles();
                updateObstacle()
                if (debbug_mode == true) debbugMode()
                drawUnified(ctx);
                updateBullets(obstacles, enemies);
                drawBullets();
                updateGrenades(obstacles);
                updateParticles();
                drawGrenades();
                drawParticles();
                drawCrosshair(mouseX, mouseY);
                motionDynamicObstacle()

                ctx.restore();

                drawToolbar();

                player.isMoving = false;
                player.updatePrevPosition()
                // Обработка управления
                if (keysPressed.KeyA) {
                    player.x -= player.isCrouching ? player.speed / 2 : player.speed;
                    player.isMoving = true;
                }
                if (keysPressed.KeyD) {
                    player.x += player.isCrouching ? player.speed / 2 : player.speed;
                    player.isMoving = true;
                }
                if (keysPressed.KeyW && !player.isJumping) player.jump();
                // if (keysPressed.KeyS && !player.isJumping) {
                //     player.isCrouching = true;
                // } else {
                //     player.isCrouching = false;
                // }
                if (keysPressed.KeyR) {
                    if (!isRKeyPressed) {
                        calcCapacityIncome(current_gun);
                        isRKeyPressed = true;
                    }
                } else {
                    isRKeyPressed = false;
                }

                if (keysPressed.Digit1) {
                    updateWeapon(weapons[0])
                }
                if (keysPressed.Digit2) {
                    updateWeapon(weapons[1])
                }
                if (keysPressed.Digit3) {
                    updateWeapon(weapons[2])
                }
                if (keysPressed.Digit4) {
                    updateWeapon(weapons[3])
                }
                if (keysPressed.Digit5) {
                    updateWeapon(weapons[4])
                }
                if (keysPressed.KeyG) {
                    createGrenade();
                    keysPressed.KeyG = false;
                }
                if (isMouseDown) {
                    const now = performance.now();
                    if (now - lastShotTime >= shotInterval) {
                        lastShotTime = now;
                        createBullet()
                    } else {
                        shooting = false
                    }
                } else {
                    shooting = false
                }

                // сбрасываем счетчик разброса
                if (shooting == false) {
                    if (current_gun.minSpreadRad) {
                        spread <= current_gun.minSpreadRad ? spread = current_gun.minSpreadRad : spread -= 0.05
                    } else {
                        spread = current_gun.spreadRad
                    }
                }

                //    if(enemies.length == 0){
                //     const newEnemy = {
                //         x: 1000 + Math.round(Math.random() * 500 - 250), 
                //         y: 450, 
                //         width: 20, 
                //         height: 40, 
                //         hp: 5, 
                //         velocity: 0, 
                //         gravity: 0.2,
                //         speed: 2,
                //         jumpPower: -7,
                //         visionRange: 400,
                //         attackRange: 300,
                //         direction: 1,
                //         isJumping: false,
                //         patrolPoints: [
                //             { x: 800, y: 450 },
                //             { x: 1200, y: 450 }
                //         ],
                //         currentPatrolIndex: 0,
                //         lastGroundY: 450
                //     };
                //     enemies.push(newEnemy);
                //     enemies.push({...newEnemy, x: newEnemy.x + 300});
                //    }

                //Останавливаем игру
                if (stopGame == true) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    return
                }

                if (progressGL == true) {
                    requestAnimationFrame(gameLoop);
                }

            } catch (error) {
                console.log('Game loop error', error);
            }
        }

        gameLoop();

    } catch (error) {
        console.log('Game error', error);
    }

}


