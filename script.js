import * as THREE from 'three';

// 1. Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue background

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

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Add a ground plane
const planeGeometry = new THREE.PlaneGeometry(30, 30);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50 }); // Green like grass
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
const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.position.set(0, -1 + 0.22, 11); // Position at penalty spot, resting on the ground
scene.add(ball);

// --- Shooting Logic & State ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const initialBallPosition = ball.position.clone();
let isShooting = false;
let shotTarget = new THREE.Vector3();
let animationStartTime;
const shotDuration = 500; // Shot duration in milliseconds

window.addEventListener('click', (event) => {
    // Don't allow a new shot while one is in progress
    if (isShooting) return;

    // Normalize mouse coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObject(targetPlane);

    if (intersects.length > 0) {
        shotTarget.copy(intersects[0].point);
        isShooting = true;
        animationStartTime = performance.now();
    }
});


// Handle window resizing
window.addEventListener('resize', () => {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
});


// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (isShooting) {
        const elapsedTime = performance.now() - animationStartTime;
        const progress = Math.min(elapsedTime / shotDuration, 1);

        // Linearly interpolate the ball's position from start to target
        ball.position.copy(initialBallPosition).lerp(shotTarget, progress);

        // When the animation is complete
        if (progress >= 1) {
            isShooting = false;
            // Reset ball position after a delay
            setTimeout(() => {
                ball.position.copy(initialBallPosition);
            }, 1000); // 1-second delay before reset
        }
    }

    renderer.render(scene, camera);
}

animate();
