import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const defaultSkyColor = new THREE.Color(0x87ceeb);
scene.background = defaultSkyColor.clone();

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

const raycaster = new THREE.Raycaster();

// ----------------------------------------------------
// Placeholder Audio Setup
// ----------------------------------------------------
const listener = new THREE.AudioListener();
camera.add(listener);

const fireballSound = new THREE.Audio(listener);
const explosionSound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();

audioLoader.load(
    "audio/fireball.mp3",
    function(buffer) {
        fireballSound.setBuffer(buffer);
        fireballSound.setVolume(0.5);
    }
);

audioLoader.load(
    "audio/explode.mp3",
    function(buffer) {
        explosionSound.setBuffer(buffer);
        explosionSound.setVolume(0.5);
    }
);

// ----------------------------------------------------
// Placeholder UI Message Setup
// ----------------------------------------------------
const uiMessage = document.createElement("div");
uiMessage.style.position = "fixed";
uiMessage.style.top = "25%";
uiMessage.style.left = "50%";
uiMessage.style.transform = "translate(-50%, -50%)";
uiMessage.style.fontFamily = "'Impact', 'Arial Black', sans-serif";
uiMessage.style.fontSize = "56px";
uiMessage.style.fontWeight = "bold";
uiMessage.style.letterSpacing = "3px";
uiMessage.style.color = "#ffcc00";
uiMessage.style.textShadow = "4px 4px 0px #000000, -2px -2px 0px #ff3300";
uiMessage.style.display = "none";
uiMessage.style.pointerEvents = "none";
uiMessage.style.zIndex = "10";
document.body.appendChild(uiMessage);

function setMessage(text) {
    uiMessage.textContent = text;
    uiMessage.style.display = "block";

    // Hide message automatically after 4 seconds
    setTimeout(() => {
        uiMessage.style.display = "none";
    }, 4000);
}

// ----------------------------------------------------
// Anime Explosion, Impact Frames & Slow-Mo State
// ----------------------------------------------------
let gateDestroyed = false;
let timeScale = 1.0;
let hitStopTimer = 0;
let slowMoTimer = 0;
let shakeIntensity = 0;
const explosionCubes = [];
const shockwaves = [];

// Shoot windup delay state (waits for hand to raise before firing raycast)
let shootDelayTimer = -1;
const SHOOT_FIRE_DELAY = 0.45; // Seconds into the animation before the blast triggers

// Impact frame materials for stark full-scene silhouettes
const impactBlackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const impactWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

function setSceneImpactLook(invertFrame) {
    // Flip background and all object materials between pure Black & White
    scene.background.setHex(invertFrame ? 0x000000 : 0xffffff);

    scene.traverse((obj) => {
        if (obj.isMesh) {
            if (!obj.userData.originalMaterial) {
                obj.userData.originalMaterial = obj.material;
            }
            obj.material = invertFrame ? impactWhiteMat : impactBlackMat;
        }
    });

    // Apply ultra-high-contrast B&W anime post-filter across the whole canvas
    renderer.domElement.style.filter = invertFrame
        ? "grayscale(100%) contrast(2000%) invert(100%)"
        : "grayscale(100%) contrast(2000%)";
}

function restoreSceneLook() {
    scene.background.copy(defaultSkyColor);
    renderer.domElement.style.filter = "none";

    scene.traverse((obj) => {
        if (obj.isMesh && obj.userData.originalMaterial) {
            obj.material = obj.userData.originalMaterial;
        }
    });
}

function triggerGateExplosion(hitPoint) {
    gateDestroyed = true;

    // 1. Play Sound
    if (explosionSound.buffer) {
        if (explosionSound.isPlaying) explosionSound.stop();
        explosionSound.play();
    }

    // 2. Trigger Full-Screen Anime Impact Frames (0.16s hit-stop freeze)
    hitStopTimer = 0.16;
    shakeIntensity = 1.8;

    // Remove gate from collision obstacles immediately
    const obsIndex = obstacles.indexOf(gate);
    if (obsIndex > -1) {
        obstacles.splice(obsIndex, 1);
    }
}

function spawnAnimeDebris() {
    // Hide the original gate mesh
    gate.visible = false;

    // Trigger UI Message
    setMessage("GATE OBLITERATED BY THE KING!");

    // Enter dramatic slow-motion right as the cubes burst out
    timeScale = 0.12;
    slowMoTimer = 1.4; // Hold slow-mo for 1.4 real seconds
    shakeIntensity = 2.2;

    const origin = gate.position.clone();

    // Create Expanding Anime Shockwave Ring
    const ringGeo = new THREE.TorusGeometry(1, 0.35, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0
    });
    const shockwave = new THREE.Mesh(ringGeo, ringMat);
    shockwave.position.copy(origin);
    scene.add(shockwave);
    shockwaves.push(shockwave);

    // Yutapon Anime Cube Palette (Wood, Glowing Orange/Yellow Embers, Dark Charcoal, White Core)
    const debrisMaterials = [
        woodMaterial,
        new THREE.MeshBasicMaterial({ color: 0xff5500 }), // Anime Fire Orange
        new THREE.MeshBasicMaterial({ color: 0xffdd00 }), // Anime Flash Yellow
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }), // Charcoal
        new THREE.MeshBasicMaterial({ color: 0xffffff })  // Pure White Impact Cube
    ];

    const cubeCount = 95;
    for (let i = 0; i < cubeCount; i++) {
        const size = 0.35 + Math.random() * 1.3;
        const geo = new THREE.BoxGeometry(size, size, size);
        const mat = debrisMaterials[Math.floor(Math.random() * debrisMaterials.length)];
        const cube = new THREE.Mesh(geo, mat);

        // Spawn inside the gate's 8x8x1 volume
        cube.position.set(
            origin.x + (Math.random() - 0.5) * 7.5,
            origin.y + (Math.random() - 0.5) * 7.5,
            origin.z + (Math.random() - 0.5) * 1.5
        );

        cube.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        cube.castShadow = true;
        cube.receiveShadow = true;

        // Explosive radial velocity outward from center
        const dir = cube.position.clone().sub(origin).normalize();
        const speed = 14 + Math.random() * 28;

        cube.userData = {
            velocity: new THREE.Vector3(
                dir.x * speed + (Math.random() - 0.5) * 12,
                Math.abs(dir.y) * speed * 0.85 + 8 + Math.random() * 12,
                dir.z * speed + (Math.random() - 0.5) * 24
            ),
            rotSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 18,
                (Math.random() - 0.5) * 18,
                (Math.random() - 0.5) * 18
            ),
            size: size,
            life: 3.5 + Math.random() * 2.0
        };

        scene.add(cube);
        explosionCubes.push(cube);
    }
}

// ----------------------------------------------------
// Animation Clock & Mixer Setup
// ----------------------------------------------------
const clock = new THREE.Clock();
let mixer = null;
let idleAction = null;
let runAction = null;
let shootAction = null;
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

function fireRaycastAtGate() {
    if (gateDestroyed) return;

    // Direction the player is currently facing
    const direction = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(player.quaternion)
        .normalize();

    // Start raycast at chest/hand height (y + 2)
    const rayOrigin = player.position.clone().add(new THREE.Vector3(0, 2, 0));
    raycaster.set(rayOrigin, direction);

    const hits = raycaster.intersectObject(gate, true);

    if (hits.length > 0) {
        triggerGateExplosion(hits[0].point);
    }
}

function checkInteraction() {
    // Prevent re-triggering while already in the middle of shooting
    if (currentAction === shootAction) return;

    if (fireballSound.buffer) {
        if (fireballSound.isPlaying) fireballSound.stop();
        fireballSound.play();
    }

    if (currentAction && shootAction) {
        currentAction.fadeOut(0.15);
        shootAction.reset().fadeIn(0.15).play();
        currentAction = shootAction;
    }

    // Start countdown so the blast waits until the player raises their hand all the way
    shootDelayTimer = SHOOT_FIRE_DELAY;
}

window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "e" && !event.repeat) {
        checkInteraction();
    }
});

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
        const shootClip = gltf.animations.find(c => /gun_shoot/i.test(c.name)) || gltf.animations[0];
        const runClip  = gltf.animations.find(c => /run|walk/i.test(c.name)) || gltf.animations[1] || gltf.animations[0];

        idleAction = mixer.clipAction(idleClip);
        runAction  = mixer.clipAction(runClip);
        shootAction = mixer.clipAction(shootClip);

        // Configure shootAction to play only ONCE and hold its final frame until crossfaded
        shootAction.setLoop(THREE.LoopOnce, 1);
        shootAction.clampWhenFinished = true;

        // Automatically transition back to idle when shootAction finishes playing once
        mixer.addEventListener('finished', (e) => {
            if (e.action === shootAction && idleAction) {
                shootAction.fadeOut(0.2);
                idleAction.reset().fadeIn(0.2).play();
                currentAction = idleAction;
            }
        });

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

    const rawDelta = Math.min(clock.getDelta(), 0.1);

    // 1. Handle Full-Scene Anime Hit-Stop & B&W Impact Frames
    if (hitStopTimer > 0) {
        hitStopTimer -= rawDelta;

        // Flicker the ENTIRE scene & player between inverted black & white silhouettes
        const invertFrame = Math.floor(hitStopTimer * 55) % 2 === 0;
        setSceneImpactLook(invertFrame);
        gate.scale.setScalar(1.08 + Math.random() * 0.12);

        // Apply camera shake during hit-stop
        camera.position.x = player.position.x + (Math.random() - 0.5) * shakeIntensity;
        camera.position.y = player.position.y + 6 + (Math.random() - 0.5) * shakeIntensity;
        renderer.render(scene, camera);

        // When Hit-Stop finishes, restore scene materials and spawn the explosion!
        if (hitStopTimer <= 0) {
            restoreSceneLook();
            spawnAnimeDebris();
        }
        return; // Freeze world movement during impact frames
    }

    // 2. Handle Slow-Motion Time Dilation Ramp
    if (slowMoTimer > 0) {
        slowMoTimer -= rawDelta;
        if (slowMoTimer <= 0) {
            // Smoothly ramp back up to 1.0 normal speed
            timeScale += (1.0 - timeScale) * 0.1;
            if (timeScale > 0.98) timeScale = 1.0;
        }
    } else if (timeScale < 1.0) {
        timeScale += (1.0 - timeScale) * 0.08;
        if (timeScale > 0.99) timeScale = 1.0;
    }

    const scaledDelta = rawDelta * timeScale;

    if (mixer) {
        mixer.update(scaledDelta);
    }

    // 3. Handle Shoot Windup Delay (Fires raycast when hand is raised)
    if (shootDelayTimer > 0) {
        shootDelayTimer -= scaledDelta;
        if (shootDelayTimer <= 0) {
            shootDelayTimer = -1;
            fireRaycastAtGate();
        }
    }

    // 4. Update Anime Explosion Cubes
    for (let i = explosionCubes.length - 1; i >= 0; i--) {
        const c = explosionCubes[i];
        const data = c.userData;

        // Move and apply gravity
        c.position.addScaledVector(data.velocity, scaledDelta);
        data.velocity.y -= 38 * scaledDelta; // Gravity

        // Bounce off the ground plane
        const halfSize = (data.size * c.scale.x) / 2;
        if (c.position.y < halfSize) {
            c.position.y = halfSize;
            data.velocity.y *= -0.55; // Bounce restitution
            data.velocity.x *= 0.8;   // Ground friction
            data.velocity.z *= 0.8;
        }

        // Spin debris cubes
        c.rotation.x += data.rotSpeed.x * scaledDelta;
        c.rotation.y += data.rotSpeed.y * scaledDelta;
        c.rotation.z += data.rotSpeed.z * scaledDelta;

        // Shrink and remove at end of life
        data.life -= scaledDelta;
        if (data.life < 1.0) {
            c.scale.setScalar(Math.max(0.001, data.life));
        }
        if (data.life <= 0) {
            scene.remove(c);
            explosionCubes.splice(i, 1);
        }
    }

    // 5. Update Expanding Shockwaves
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.scale.addScalar(45 * scaledDelta);
        sw.material.opacity -= 1.8 * scaledDelta;
        if (sw.material.opacity <= 0) {
            scene.remove(sw);
            shockwaves.splice(i, 1);
        }
    }

    // 6. Player Movement & Collision
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

        // WASD
        if (keys["w"]) moveZ -= 1;
        if (keys["s"]) moveZ += 1;
        if (keys["a"]) moveX -= 1;
        if (keys["d"]) moveX += 1;

        const isMoving = (moveX !== 0 || moveZ !== 0);

        if (isMoving) {
            // Cancel pending shot if player starts running mid-windup
            shootDelayTimer = -1;

            // Normalize diagonal movement speed (affected by slow-mo timeScale)
            const length = Math.hypot(moveX, moveZ);
            player.position.x += (moveX / length) * playerSpeed * timeScale;
            player.position.z += (moveZ / length) * playerSpeed * timeScale;

            // Face movement direction
            player.rotation.y = Math.atan2(moveX, moveZ);

            // Crossfade to Run
            if (currentAction !== runAction && runAction) {
                currentAction.fadeOut(0.2);
                runAction.reset().fadeIn(0.2).play();
                currentAction = runAction;
            }
        } else {
            // Crossfade back to Idle (unless shootAction is currently playing)
            if (currentAction !== shootAction && currentAction !== idleAction && idleAction) {
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

        // Decay camera shake
        if (shakeIntensity > 0) {
            shakeIntensity *= 0.88;
            if (shakeIntensity < 0.01) shakeIntensity = 0;
        }

        const shakeX = (Math.random() - 0.5) * shakeIntensity;
        const shakeY = (Math.random() - 0.5) * shakeIntensity;

        // Camera chases player from behind + screen shake offset
        camera.position.x = player.position.x + shakeX;
        camera.position.y = player.position.y + 6 + shakeY;
        camera.position.z = player.position.z + 10;
        controls.target.set(player.position.x + shakeX, player.position.y + 2 + shakeY, player.position.z);
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();