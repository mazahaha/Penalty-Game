import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

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

// Add backdrop using an HDR environment map for realistic lighting
new RGBELoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/equirectangular/venice_sunset_1k.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    scene.environment = texture;
});

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

// Field Markings
const markings = new THREE.Group();
const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const lineWidth = 0.1;
const penaltyBoxWidth = 22;
const penaltyBoxDepth = 12;

// Penalty Box Lines
const topLineGeo = new THREE.PlaneGeometry(penaltyBoxWidth, lineWidth);
const topLine = new THREE.Mesh(topLineGeo, lineMaterial);
topLine.rotation.x = -Math.PI / 2;
topLine.position.set(0, 0, -penaltyBoxDepth);
markings.add(topLine);

const sideLineGeo = new THREE.PlaneGeometry(lineWidth, penaltyBoxDepth);
const leftLine = new THREE.Mesh(sideLineGeo, lineMaterial);
leftLine.rotation.x = -Math.PI / 2;
leftLine.position.set(-penaltyBoxWidth / 2, 0, -penaltyBoxDepth / 2);
markings.add(leftLine);

const rightLine = new THREE.Mesh(sideLineGeo.clone(), lineMaterial);
rightLine.rotation.x = -Math.PI / 2;
rightLine.position.set(penaltyBoxWidth / 2, 0, -penaltyBoxDepth / 2);
markings.add(rightLine);

// Position the markings slightly above the ground to prevent z-fighting
markings.position.y = -0.99;
scene.add(markings);


// Create Goal
const goal = new THREE.Group();
const postMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
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

// Create Net
const netTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/grid.png');
netTexture.wrapS = THREE.RepeatWrapping;
netTexture.wrapT = THREE.RepeatWrapping;
netTexture.repeat.set(goalWidth, goalHeight);
const netMaterial = new THREE.MeshBasicMaterial({
    map: netTexture,
    transparent: true,
    side: THREE.DoubleSide
});
const netGeometry = new THREE.PlaneGeometry(goalWidth, goalHeight);
const netMesh = new THREE.Mesh(netGeometry, netMaterial);
netMesh.position.set(0, goalHeight / 2 - 1, -0.5); // Position it in the middle of the goal depth
goal.add(netMesh);

scene.add(goal);

// Create an invisible plane for raycasting
const targetPlaneGeometry = new THREE.PlaneGeometry(goalWidth, goalHeight);
const targetPlaneMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
const targetPlane = new THREE.Mesh(targetPlaneGeometry, targetPlaneMaterial);
targetPlane.position.set(0, goalHeight / 2 - 1, 0.1); // Slightly in front of the goal line to catch clicks
scene.add(targetPlane);

// Create Ball
const ballGeometry = new THREE.SphereGeometry(0.22, 32, 32); // FIFA size 5 ball has ~22cm diameter
const ballTexture = textureLoader.load('https://threejsfundamentals.org/threejs/resources/images/football/Football.jpg');
const ballNormalMap = textureLoader.load('https://threejsfundamentals.org/threejs/resources/images/football/Football_Normal.jpg');
const ballMaterial = new THREE.MeshStandardMaterial({
    map: ballTexture,
    normalMap: ballNormalMap
});
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.position.set(0, -1 + 0.22, 11); // Position at penalty spot, resting on the ground
scene.add(ball);

// Create Goalkeeper
const goalkeeper = new THREE.Group();
const keeperMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00, flatShading: true }); // Green jersey
const shortsMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, flatShading: true });
const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac, flatShading: true });
const glovesMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });

// Torso
const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.4);
const torso = new THREE.Mesh(torsoGeo, keeperMaterial);
torso.name = 'torso';
torso.position.y = 0.3;
goalkeeper.add(torso);

// Shorts
const shortsGeo = new THREE.BoxGeometry(0.8, 0.4, 0.4);
const shorts = new THREE.Mesh(shortsGeo, shortsMaterial);
shorts.position.y = -0.4;
goalkeeper.add(shorts);

// Head
const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
const head = new THREE.Mesh(headGeo, skinMaterial);
head.position.y = 1.0;
goalkeeper.add(head);

// Arms
const armGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
const leftArm = new THREE.Mesh(armGeo, keeperMaterial);
leftArm.position.set(-0.5, 0.4, 0);
goalkeeper.add(leftArm);
const rightArm = new THREE.Mesh(armGeo.clone(), keeperMaterial);
rightArm.position.set(0.5, 0.4, 0);
goalkeeper.add(rightArm);

// Gloves
const gloveGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
const leftGlove = new THREE.Mesh(gloveGeo, glovesMaterial);
leftGlove.position.y = -0.5;
leftArm.add(leftGlove); // Add to arm
const rightGlove = new THREE.Mesh(gloveGeo.clone(), glovesMaterial);
rightGlove.position.y = -0.5;
rightArm.add(rightGlove); // Add to arm

// Legs
const legGeo = new THREE.BoxGeometry(0.3, 1.0, 0.3);
const leftLeg = new THREE.Mesh(legGeo, shortsMaterial);
leftLeg.position.set(-0.25, -1.1, 0);
goalkeeper.add(leftLeg);
const rightLeg = new THREE.Mesh(legGeo.clone(), shortsMaterial);
rightLeg.position.set(0.25, -1.1, 0);
goalkeeper.add(rightLeg);

// Position the keeper group so his feet are on the ground
goalkeeper.position.set(0, 0.7, 0.5);
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
