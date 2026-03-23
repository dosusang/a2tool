import * as THREE from 'three';
import { ARENA_RADIUS, ORB_OUTER_RADIUS } from '../constants.js';

export function createScene(renderer) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x08111f, 45, 120);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 8, 12);

  const ambient = new THREE.HemisphereLight(0xb6d4ff, 0x08111f, 1.25);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xcbe0ff, 1.8);
  keyLight.position.set(26, 34, 18);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -70;
  keyLight.shadow.camera.right = 70;
  keyLight.shadow.camera.top = 70;
  keyLight.shadow.camera.bottom = -70;
  scene.add(keyLight);

  const floorTexture = createFloorNoiseTexture();
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(5, 5);

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(ARENA_RADIUS, ARENA_RADIUS, 0.8, 96),
    new THREE.MeshStandardMaterial({
      color: 0x1a2b3f,
      roughness: 0.94,
      metalness: 0.04,
      map: floorTexture,
    }),
  );
  floor.receiveShadow = true;
  floor.position.y = -0.4;
  scene.add(floor);

  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(ORB_OUTER_RADIUS - 0.8, ORB_OUTER_RADIUS + 0.7, 128),
    new THREE.MeshBasicMaterial({
      color: 0xff5b73,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
    }),
  );
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.05;
  scene.add(outerRing);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  return { scene, camera };
}

function createFloorNoiseTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const grain = (Math.random() * 26) | 0;
      const waveA = Math.sin(x * 0.18) * 7;
      const waveB = Math.cos(y * 0.14) * 9;
      const waveC = Math.sin((x + y) * 0.08) * 8;
      const value = 56 + grain + waveA + waveB + waveC;

      image.data[i] = value * 0.72;
      image.data[i + 1] = value * 0.9;
      image.data[i + 2] = value * 1.12;
      image.data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return new THREE.CanvasTexture(canvas);
}
