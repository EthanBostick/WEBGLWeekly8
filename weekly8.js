import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(0, 8, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(
    camera,
    renderer.domElement
);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// ----------------------------------------------------
// Animation Clock & Mixer Setup
// ----------------------------------------------------
const clock = new THREE.Clock();
let mixer = null;
let idleAction = null;
let runAction = null;
let currentAction = null;

// ----------------------------------------------------
// Obstacles & Collision Setup
// ----------------------------------------------------
const obstacles = [];
const playerBox = new THREE.Box3();
const obstacleBox = new THREE.Box3();

// ----------------------------------------------------
// Player Setup & Controls
// ----------------------------------------------------
const playerSpeed = 0.15;
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// ----------------------------------------------------
// 3D Models
// ----------------------------------------------------
const modelLoader = new GLTFLoader();

// Catapult
modelLoader.load('models/catapult.glb', function(gltf) {
    const catapult = gltf.scene;
    catapult.position.set(0, 0, 0);
    catapult.scale.set(100, 100, 100);

    catapult.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    scene.add(catapult);
    obstacles.push(catapult);
});

// Right Barracks
modelLoader.load('models/barracks.glb', function(gltf) {
    const barracksRight = gltf.scene;
    barracksRight.position.set(18, 0, -10);
    barracksRight.scale.set(7, 7, 7);

    barracksRight.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    scene.add(barracksRight);
    obstacles.push(barracksRight);
});

// Left Barracks
modelLoader.load('models/barracks.glb', function(gltf) {
    const barracksLeft = gltf.scene;
    barracksLeft.position.set(-18, 0, -10);
    barracksLeft.scale.set(7, 7, 7);

    barracksLeft.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    scene.add(barracksLeft);
    obstacles.push(barracksLeft);
});

// Player Character (King)
let player = new THREE.Group();
player.position.set(0, 0, 6);
scene.add(player);

modelLoader.load('models/king.glb', function(gltf) {
    const model = gltf.scene;
    model.scale.set(2, 2, 2);

    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // 1. Calculate the model's internal center offset
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());

    // 2. Re-center the model so its pivot is right between its feet
    model.position.x = -center.x;
    model.position.z = -center.z;
    // Keep feet on the ground (align lowest Y to 0)
    model.position.y = -box.min.y;

    player.add(model);

    // Setup animations
    if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);

        const idleClip = gltf.animations.find(c => /idle/i.test(c.name)) || gltf.animations[0];
        const runClip  = gltf.animations.find(c => /run|walk/i.test(c.name)) || gltf.animations[1] || gltf.animations[0];

        idleAction = mixer.clipAction(idleClip);
        runAction  = mixer.clipAction(runClip);

        idleAction.play();
        currentAction = idleAction;
    }
});

// ----------------------------------------------------
// Textures & Materials
// ----------------------------------------------------
const loader = new THREE.TextureLoader();

function loadTiledTexture(url, repeatX, repeatY) {
    const tex = loader.load(url);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    return tex;
}

const stoneColor = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_rocks_02/aerial_rocks_02_diff_1k.jpg', 10, 10);
const stoneNormal = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_rocks_02/aerial_rocks_02_nor_gl_1k.jpg', 10, 10);
const stoneRough = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_rocks_02/aerial_rocks_02_rough_1k.jpg', 10, 10);
const stoneAO = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_rocks_02/aerial_rocks_02_ao_1k.jpg', 10, 10);

const wallColor = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/castle_brick_02_red/castle_brick_02_red_diff_1k.jpg', 4, 2);
const wallNormal = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/castle_brick_02_red/castle_brick_02_red_nor_gl_1k.jpg', 4, 2);
const wallRough = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/castle_brick_02_red/castle_brick_02_red_rough_1k.jpg', 4, 2);
const wallAO = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/castle_brick_02_red/castle_brick_02_red_ao_1k.jpg', 4, 2);

const woodColor = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_planks/wood_planks_diff_1k.jpg', 2, 2);
const woodNormal = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_planks/wood_planks_nor_gl_1k.jpg', 2, 2);
const woodRough = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_planks/wood_planks_rough_1k.jpg', 2, 2);

const bannerColor = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/fabric_pattern_07/fabric_pattern_07_col_1_1k.jpg', 1, 2);
const bannerRough = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/fabric_pattern_07/fabric_pattern_07_rough_1k.jpg', 1, 2);

const metalColor = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/corrugated_iron/corrugated_iron_diff_1k.jpg', 2, 2);
const metalMap = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/corrugated_iron/corrugated_iron_metal_1k.jpg', 2, 2);
const metalRough = loadTiledTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/corrugated_iron/corrugated_iron_rough_1k.jpg', 2, 2);

const groundMaterial = new THREE.MeshStandardMaterial({
    map: stoneColor,
    normalMap: stoneNormal,
    roughnessMap: stoneRough,
    aoMap: stoneAO
});

const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallColor,
    normalMap: wallNormal,
    roughnessMap: wallRough,
    aoMap: wallAO
});

const woodMaterial = new THREE.MeshStandardMaterial({
    map: woodColor,
    normalMap: woodNormal,
    roughnessMap: woodRough
});

const bannerMaterial = new THREE.MeshStandardMaterial({
    map: bannerColor,
    roughnessMap: bannerRough,
    side: THREE.DoubleSide
});

const metalMaterial = new THREE.MeshStandardMaterial({
    map: metalColor,
    metalnessMap: metalMap,
    roughnessMap: metalRough,
    metalness: 0.9,
    roughness: 0.4
});

const lanternMaterial = new THREE.MeshStandardMaterial({
    map: wallColor,
    emissive: new THREE.Color(0xff6600),
    emissiveMap: wallColor,
    emissiveIntensity: 2.5
});

// ----------------------------------------------------
// Environment Meshes (Obstacles)
// ----------------------------------------------------
const groundGeometry = new THREE.PlaneGeometry(100, 100);
groundGeometry.setAttribute('uv2', new THREE.BufferAttribute(groundGeometry.attributes.uv.array, 2));

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const wallGeo = new THREE.BoxGeometry(14, 10, 2);
wallGeo.setAttribute('uv2', new THREE.BufferAttribute(wallGeo.attributes.uv.array, 2));

const leftWall = new THREE.Mesh(wallGeo, wallMaterial);
leftWall.position.set(-11, 5, -10);
leftWall.castShadow = true;
leftWall.receiveShadow = true;
scene.add(leftWall);
obstacles.push(leftWall);

const rightWall = new THREE.Mesh(wallGeo, wallMaterial);
rightWall.position.set(11, 5, -10);
rightWall.castShadow = true;
rightWall.receiveShadow = true;
scene.add(rightWall);
obstacles.push(rightWall);

const towerGeo = new THREE.CylinderGeometry(3.5, 3.5, 14, 16);
const leftTower = new THREE.Mesh(towerGeo, wallMaterial);
leftTower.position.set(-19, 7, -10);
leftTower.castShadow = true;
leftTower.receiveShadow = true;
scene.add(leftTower);
obstacles.push(leftTower);

const rightTower = new THREE.Mesh(towerGeo, wallMaterial);
rightTower.position.set(19, 7, -10);
rightTower.castShadow = true;
rightTower.receiveShadow = true;
scene.add(rightTower);
obstacles.push(rightTower);

const gateGeo = new THREE.BoxGeometry(8, 8, 1);
const gate = new THREE.Mesh(gateGeo, woodMaterial);
gate.position.set(0, 4, -10);
gate.castShadow = true;
gate.receiveShadow = true;
scene.add(gate);
obstacles.push(gate);

const crateGeo = new THREE.BoxGeometry(2.5, 2.5, 2.5);
const crate1 = new THREE.Mesh(crateGeo, woodMaterial);
crate1.position.set(-6, 1.25, -4);
crate1.castShadow = true;
crate1.receiveShadow = true;
scene.add(crate1);
obstacles.push(crate1);

const crate2 = new THREE.Mesh(crateGeo, woodMaterial);
crate2.position.set(-4.5, 1.25, -1);
crate2.rotation.y = 0.4;
crate2.castShadow = true;
crate2.receiveShadow = true;
scene.add(crate2);
obstacles.push(crate2);

const barrelGeo = new THREE.CylinderGeometry(1.2, 1.2, 3, 16);
const barrel = new THREE.Mesh(barrelGeo, metalMaterial);
barrel.position.set(6, 1.5, -5);
barrel.castShadow = true;
barrel.receiveShadow = true;
scene.add(barrel);
obstacles.push(barrel);

const bannerGeo = new THREE.PlaneGeometry(2.5, 6);
const leftBanner = new THREE.Mesh(bannerGeo, bannerMaterial);
leftBanner.position.set(-8, 6, -8.9);
leftBanner.castShadow = true;
scene.add(leftBanner);

const rightBanner = new THREE.Mesh(bannerGeo, bannerMaterial);
rightBanner.position.set(8, 6, -8.9);
rightBanner.castShadow = true;
scene.add(rightBanner);

const lanternGeo = new THREE.SphereGeometry(0.6, 16, 16);
const leftLantern = new THREE.Mesh(lanternGeo, lanternMaterial);
leftLantern.position.set(-4.5, 7, -8.8);
scene.add(leftLantern);

const rightLantern = new THREE.Mesh(lanternGeo, lanternMaterial);
rightLantern.position.set(4.5, 7, -8.8);
scene.add(rightLantern);

// ----------------------------------------------------
// Lights
// ----------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(20, 30, 15);
directionalLight.castShadow = true;
scene.add(directionalLight);

let lightsOn = true;
const toggleBtn = document.getElementById("toggleButton");
if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
        lightsOn = !lightsOn;
        ambientLight.visible = lightsOn;
        directionalLight.visible = lightsOn;
    });
}

function setScreenshotMode(mode) {
    const allMaterials = [groundMaterial, wallMaterial, woodMaterial, bannerMaterial, metalMaterial, lanternMaterial];

    if (mode === '1') {
        allMaterials.forEach(m => {
            m.wireframe = true;
            m.map = null;
            m.normalMap = null;
            m.roughnessMap = null;
            m.aoMap = null;
            m.metalnessMap = null;
            m.emissiveMap = null;
            m.needsUpdate = true;
        });
    } else {
        allMaterials.forEach(m => m.wireframe = false);

        groundMaterial.map = stoneColor;
        wallMaterial.map = wallColor;
        woodMaterial.map = woodColor;
        bannerMaterial.map = bannerColor;
        metalMaterial.map = metalColor;
        lanternMaterial.map = wallColor;

        const useNormal = (mode >= '3');
        groundMaterial.normalMap = useNormal ? stoneNormal : null;
        wallMaterial.normalMap = useNormal ? wallNormal : null;
        woodMaterial.normalMap = useNormal ? woodNormal : null;

        const useRough = (mode >= '4');
        groundMaterial.roughnessMap = useRough ? stoneRough : null;
        wallMaterial.roughnessMap = useRough ? wallRough : null;
        woodMaterial.roughnessMap = useRough ? woodRough : null;
        bannerMaterial.roughnessMap = useRough ? bannerRough : null;
        metalMaterial.roughnessMap = useRough ? metalRough : null;

        const useBonus = (mode === '5');
        groundMaterial.aoMap = useBonus ? stoneAO : null;
        wallMaterial.aoMap = useBonus ? wallAO : null;
        metalMaterial.metalnessMap = useBonus ? metalMap : null;
        lanternMaterial.emissiveMap = useBonus ? wallColor : null;
        lanternMaterial.emissiveIntensity = useBonus ? 2.5 : 0.0;

        allMaterials.forEach(m => m.needsUpdate = true);
    }
}

window.addEventListener("keydown", (e) => {
    if (['1', '2', '3', '4', '5'].includes(e.key)) {
        setScreenshotMode(e.key);
    }
});

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ----------------------------------------------------
// Animation Loop
// ----------------------------------------------------
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) {
        mixer.update(delta);
    }

    if (player) {
        const prevX = player.position.x;
        const prevZ = player.position.z;

        let moveX = 0;
        let moveZ = 0;

        // Arrow controls direction vectors
        if (keys["ArrowUp"]) moveZ -= 1;
        if (keys["ArrowDown"]) moveZ += 1;
        if (keys["ArrowLeft"]) moveX -= 1;
        if (keys["ArrowRight"]) moveX += 1;

        const isMoving = (moveX !== 0 || moveZ !== 0);

        if (isMoving) {
            // Normalize diagonal movement speed
            const length = Math.hypot(moveX, moveZ);
            player.position.x += (moveX / length) * playerSpeed;
            player.position.z += (moveZ / length) * playerSpeed;

            // Face movement direction
            player.rotation.y = Math.atan2(moveX, moveZ);

            // Crossfade to Run
            if (currentAction !== runAction && runAction) {
                currentAction.fadeOut(0.2);
                runAction.reset().fadeIn(0.2).play();
                currentAction = runAction;
            }
        } else {
            // Crossfade back to Idle
            if (currentAction !== idleAction && idleAction) {
                currentAction.fadeOut(0.2);
                idleAction.reset().fadeIn(0.2).play();
                currentAction = idleAction;
            }
        }

        // Clamp inside ground area
        player.position.x = Math.max(-45, Math.min(45, player.position.x));
        player.position.z = Math.max(-45, Math.min(45, player.position.z));

        // Update player bounding box
        playerBox.setFromObject(player);
        playerBox.expandByScalar(-0.4); // Shrinks all sides by 0.4 units

        for (let obstacle of obstacles) {
            obstacleBox.setFromObject(obstacle);
            obstacleBox.expandByScalar(-0.2);

            if (playerBox.intersectsBox(obstacleBox)) {
                console.log("Collision!");
                player.position.x = prevX;
                player.position.z = prevZ;
                break;
            }

        }

        // Camera chases player from behind
        camera.position.x = player.position.x;
        camera.position.y = player.position.y + 6;
        camera.position.z = player.position.z + 10;
        controls.target.set(player.position.x, player.position.y + 2, player.position.z);
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();