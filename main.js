// main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// OrbitControls - faqat debug uchun, o'yinda ishlatilmaydi
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enabled = false; // O'yinda kamera avtomatik kuzatadi

// Lighting
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

// Traffic light
const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 3),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
);
pole.position.set(-4.5, 1.5, 2);
scene.add(pole);

const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.7, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
);
box.position.set(-4.5, 2.3, 2);
scene.add(box);

const red = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 })
);
red.position.set(-4.5, 2.5, 2.15);
scene.add(red);

// Road sign
const signPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 2),
    new THREE.MeshStandardMaterial({ color: 0x888888 })
);
signPost.position.set(4, 1, -10);
scene.add(signPost);

const sign = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 32),
    new THREE.MeshStandardMaterial({ color: 0x0057b7 })
);
sign.position.set(4, 2, -10);
sign.rotation.y = Math.PI / 2;
scene.add(sign);

// Load Gentra model
let gentraModel;
const loader = new GLTFLoader();
loader.load('https://github.com/abbosbey2002/Car-game-Threejs/blob/main/models/car/scene.gltf', (gltf) => {
    gentraModel = gltf.scene;
    gentraModel.scale.set(1.5, 1.5, 1.5);
    gentraModel.position.set(0, 1.1, 54);
    scene.add(gentraModel);

    // Kamera o'zgaruvchilarini boshlang'ich holatga keltirish
    initializeCamera();
}, undefined, (error) => {
    console.error('❌ Gentra model loading error:', error);
});

// Load City model and extract colliders
const colliders = [];
const cityLoader = new GLTFLoader();
cityLoader.load('/models/city/modern_city_block.glb', (gltf) => {
    const city = gltf.scene;
    city.scale.set(0.01, 0.01, 0.01)
    city.position.set(0, 0, 0);
    scene.add(city);

    city.traverse((child) => {
        if (child.isMesh) {
            child.geometry.computeBoundingBox();
            colliders.push(child);
        }
    });
}, undefined, (error) => {
    console.error('❌ City model loading error:', error);
});

// Controls
const keys = {};
document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Movement variables
let velocity = 0;
const maxSpeed = 1
const acceleration = 0.005;
const friction = 0.01;

// Camera variables - YANGI QO'SHILDI
const cameraOffset = new THREE.Vector3(0, 6, 10); // Mashina orqasidan offset
const cameraLookOffset = new THREE.Vector3(0, 2, 0); // Mashina oldiga qarash uchun
let cameraPosition = new THREE.Vector3();
let cameraTarget = new THREE.Vector3();
let cameraFollowMode = false; // Kamera rejimi

// Kamera boshlang'ich holatini sozlash funksiyasi
function initializeCamera() {
    if (gentraModel) {
        const carRotation = gentraModel.rotation.y;

        // Boshlang'ich kamera pozitsiyasini hisoblash
        const initialOffset = cameraOffset.clone();
        initialOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), carRotation);
        cameraPosition.copy(gentraModel.position).add(initialOffset);

        const initialLookOffset = cameraLookOffset.clone();
        cameraTarget.copy(gentraModel.position).add(initialLookOffset);

        camera.position.copy(cameraPosition);
        camera.lookAt(cameraTarget);

        cameraFollowMode = true; // Kamera kuzatishni yoqish
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (gentraModel) {
        // Speed control
        if (keys['w']) velocity = Math.min(velocity + acceleration, maxSpeed);
        else if (keys['s']) velocity = Math.max(velocity - acceleration, -maxSpeed / 2);
        else velocity += (velocity > 0 ? -friction : friction);
        velocity = Math.sign(velocity) * Math.max(0, Math.abs(velocity));

        // Rotation if moving
        if (velocity !== 0) {
            if (keys['a']) gentraModel.rotation.y += 0.03;
            if (keys['d']) gentraModel.rotation.y -= 0.03;
        }

        // Move car
        gentraModel.position.x -= Math.sin(gentraModel.rotation.y) * velocity;
        gentraModel.position.z -= Math.cos(gentraModel.rotation.y) * velocity;

        // Camera follow - TO'LIQ TUZATILDI
        if (cameraFollowMode) {
            const carRotation = gentraModel.rotation.y;

            // Kerakli kamera pozitsiyasini hisoblash (mashina orqasidan)
            const desiredCameraOffset = cameraOffset.clone();
            desiredCameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), carRotation);
            const desiredCameraPos = gentraModel.position.clone().add(desiredCameraOffset);

            // Kerakli qarash nuqtasini hisoblash (mashina oldiga)
            const desiredLookOffset = cameraLookOffset.clone();
            const desiredLookTarget = gentraModel.position.clone().add(desiredLookOffset);

            // Yumshoq kamera harakati
            const cameraSmooth = 0.1;
            cameraPosition.lerp(desiredCameraPos, cameraSmooth);
            cameraTarget.lerp(desiredLookTarget, cameraSmooth);

            // Kamera pozitsiyasini qo'llash
            camera.position.copy(cameraPosition);
            camera.lookAt(cameraTarget);
        }
    }

    // OrbitControls faqat debug rejimida ishlaydi
    if (!cameraFollowMode) {
        controls.update();
    }

    renderer.render(scene, camera);
}

// Kamera rejimini o'zgartirish (C tugmasi bilan)
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'c' && gentraModel) {
        cameraFollowMode = !cameraFollowMode;
        controls.enabled = !cameraFollowMode;

        if (cameraFollowMode) {
            initializeCamera();
        }

        console.log('Camera mode:', cameraFollowMode ? 'Follow' : 'Free');
    }
});

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});