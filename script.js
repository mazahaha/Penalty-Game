import * as THREE from 'three';

// 1. Scene
const scene = new THREE.Scene();
// scene.background will be replaced by a skybox/backdrop

// 2. Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 15); // Position the camera further back to see the ball and goal
camera.lookAt(0, 0, 0);

// 3. Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#game-canvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// --- Audio ---
const listener = new THREE.AudioListener();
camera.add(listener);
const audioLoader = new THREE.AudioLoader();
const kickSound = new THREE.Audio(listener);
audioLoader.load('https://threejsfundamentals.org/threejs/resources/sounds/plop.ogg', (buffer) => {
    kickSound.setBuffer(buffer);
    kickSound.setVolume(0.5);
});
const saveSound = new THREE.Audio(listener);
audioLoader.load('https://threejsfundamentals.org/threejs/resources/sounds/thump.ogg', (buffer) => {
    saveSound.setBuffer(buffer);
    saveSound.setVolume(0.5);
});
const goalSound = new THREE.Audio(listener);
audioLoader.load('https://threejsfundamentals.org/threejs/resources/sounds/pop.ogg', (buffer) => {
    goalSound.setBuffer(buffer);
    goalSound.setVolume(0.5);
});

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Add a ground plane
const textureLoader = new THREE.TextureLoader();

// Add backdrop
const backdropTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/2294472375_24a3b8ef46_o.jpg');
const backdropGeometry = new THREE.SphereGeometry(500, 60, 40);
backdropGeometry.scale(-1, 1, 1); // Invert the geometry to face inward
const backdropMaterial = new THREE.MeshBasicMaterial({ map: backdropTexture });
const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial);
scene.add(backdrop);

const grassTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg');
grassTexture.wrapS = THREE.RepeatWrapping;
grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(10, 10);
const planeGeometry = new THREE.PlaneGeometry(30, 30);
const planeMaterial = new THREE.MeshStandardMaterial({ map: grassTexture });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2; // Rotate it to be horizontal
plane.position.y = -1;
scene.add(plane);

// Create Goal
const goal = new THREE.Group();
const postMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
const postThickness = 0.2;
const goalHeight = 2.5;
const goalWidth = 8;

// Left Post
const leftPostGeometry = new THREE.BoxGeometry(postThickness, goalHeight, postThickness);
const leftPost = new THREE.Mesh(leftPostGeometry, postMaterial);
leftPost.position.set(-goalWidth / 2, goalHeight / 2 - 1, 0);
goal.add(leftPost);

// Right Post
const rightPostGeometry = new THREE.BoxGeometry(postThickness, goalHeight, postThickness);
const rightPost = new THREE.Mesh(rightPostGeometry, postMaterial);
rightPost.position.set(goalWidth / 2, goalHeight / 2 - 1, 0);
goal.add(rightPost);

// Crossbar
const crossbarGeometry = new THREE.BoxGeometry(goalWidth + postThickness, postThickness, postThickness);
const crossbar = new THREE.Mesh(crossbarGeometry, postMaterial);
crossbar.position.set(0, goalHeight - 1, 0);
goal.add(crossbar);

scene.add(goal);

// Create an invisible plane for raycasting
const targetPlaneGeometry = new THREE.PlaneGeometry(goalWidth, goalHeight);
const targetPlaneMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
const targetPlane = new THREE.Mesh(targetPlaneGeometry, targetPlaneMaterial);
targetPlane.position.set(0, goalHeight / 2 - 1, 0.1); // Slightly in front of the goal line to catch clicks
scene.add(targetPlane);

// Create Ball
const ballGeometry = new THREE.SphereGeometry(0.22, 32, 32); // FIFA size 5 ball has ~22cm diameter
const ballTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/ball.png');
const ballMaterial = new THREE.MeshStandardMaterial({ map: ballTexture });
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.position.set(0, -1 + 0.22, 11); // Position at penalty spot, resting on the ground
scene.add(ball);

// Create Goalkeeper
const goalkeeper = new THREE.Group();
const keeperBodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red shirt

const torsoGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.5);
const torso = new THREE.Mesh(torsoGeometry, keeperBodyMaterial);
torso.name = 'torso'; // Name it for collision detection later
goalkeeper.add(torso);

const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac }); // Skin tone
const head = new THREE.Mesh(headGeometry, headMaterial);
head.position.y = 0.8;
goalkeeper.add(head);

// Position the keeper in the goal, standing on the ground plane
goalkeeper.position.y = -1 + (1.2 / 2);
goalkeeper.position.z = 0.5;
scene.add(goalkeeper);


// --- UI ---
const scoreDisplay = document.getElementById('score-display');

// --- Physics and Game State ---
const clock = new THREE.Clock();
const gravity = new THREE.Vector3(0, -9.8, 0);
const initialBallPosition = ball.position.clone();
const initialKeeperPosition = goalkeeper.position.clone();
const keeperDiveDistance = goalWidth / 2 - 0.5;

ball.velocity = new THREE.Vector3();
let score = 0;
let isShooting = false;
let keeperState = 'idle'; // 'idle', 'divingLeft', 'divingRight'

const curveFactor = 0.05;
function applyCurve(event) {
    if (isShooting) {
        ball.velocity.x += event.movementX * curveFactor;
    }
}

function resetScene() {
    isShooting = false;
    keeperState = 'idle';
    ball.velocity.set(0, 0, 0);
    window.removeEventListener('mousemove', applyCurve); // Important cleanup
    setTimeout(() => {
        ball.position.copy(initialBallPosition);
        goalkeeper.position.copy(initialKeeperPosition);
        goalkeeper.rotation.set(0, 0, 0);
    }, 1000);
}

// --- Shooting Logic ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    if (isShooting) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(targetPlane);

    if (intersects.length > 0) {
        const targetPoint = intersects[0].point;

        const direction = new THREE.Vector3().subVectors(targetPoint, initialBallPosition);
        direction.y *= 1.5;
        const kickStrength = 18;
        ball.velocity.copy(direction).normalize().multiplyScalar(kickStrength);

        isShooting = true;
        kickSound.play();
        window.addEventListener('mousemove', applyCurve);

        // --- Smarter Goalkeeper AI ---
        // Predict where the ball will cross the goal line based on initial velocity.
        // This simple prediction doesn't account for curve, making the AI beatable.
        const timeToGoal = -initialBallPosition.z / ball.velocity.z;
        const predictedX = initialBallPosition.x + ball.velocity.x * timeToGoal;

        // Add some randomness/error to the AI's decision
        const errorChance = Math.random();
        if (errorChance < 0.25) { // 25% chance of making a random move
            const directions = ['divingLeft', 'divingRight', 'idle'];
            keeperState = directions[Math.floor(Math.random() * directions.length)];
        } else {
            // Make an educated guess based on the predicted landing spot
            if (predictedX > keeperDiveDistance / 2) {
                keeperState = 'divingRight';
            } else if (predictedX < -keeperDiveDistance / 2) {
                keeperState = 'divingLeft';
            } else {
                keeperState = 'idle';
            }
        }
    }
});

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    if (isShooting) {
        ball.velocity.add(gravity.clone().multiplyScalar(deltaTime));
        ball.position.add(ball.velocity.clone().multiplyScalar(deltaTime));

        const torso = goalkeeper.getObjectByName('torso');
        if (torso) {
            const ballBox = new THREE.Box3().setFromObject(ball);
            const keeperBox = new THREE.Box3().setFromObject(torso);
            if (ballBox.intersectsBox(keeperBox)) {
                console.log("SAVE!");
                saveSound.play();
                resetScene();
                return;
            }
        }

        // Goal/Miss Detection
        if (ball.position.z <= 0) {
            const inGoalX = Math.abs(ball.position.x) < goalWidth / 2;
            const inGoalY = ball.position.y > -1 && ball.position.y < (goalHeight - 1);
            if (inGoalX && inGoalY) {
                console.log("GOAL!");
                score++;
                scoreDisplay.textContent = `Score: ${score}`;
                goalSound.play();
                resetScene();
            } else {
                console.log("MISS!");
                resetScene();
            }
        }
    }

    // Goalkeeper animations
    if (keeperState === 'idle' && !isShooting) {
        goalkeeper.position.x = Math.sin(clock.getElapsedTime() * 0.8) * keeperDiveDistance;
        goalkeeper.rotation.set(0,0,0);
    } else if (keeperState.startsWith('diving')) {
        const diveTargetX = keeperState === 'divingLeft' ? -keeperDiveDistance : keeperDiveDistance;
        goalkeeper.position.x += (diveTargetX - goalkeeper.position.x) * 0.1;

        const diveProgress = Math.abs(goalkeeper.position.x / keeperDiveDistance);
        goalkeeper.rotation.z = (keeperState === 'divingLeft' ? 1 : -1) * (Math.PI / 3) * diveProgress;
    }

    renderer.render(scene, camera);
}

animate();
