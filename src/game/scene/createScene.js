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

  scene.add(createEntranceRoad());
  scene.add(createNorthPillar());

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  return { scene, camera };
}

function createEntranceRoad() {
  const group = new THREE.Group();
  const roadWidth = 18;
  const roadLength = 56;
  const roadCenterZ = ARENA_RADIUS + 25;

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(roadWidth, 0.36, roadLength),
    new THREE.MeshStandardMaterial({
      color: 0x2d3c49,
      roughness: 0.94,
      metalness: 0.1,
    }),
  );
  road.position.set(0, -0.18, roadCenterZ);
  road.receiveShadow = true;
  group.add(road);

  const lane = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, roadLength - 4),
    new THREE.MeshBasicMaterial({
      color: 0x4b6170,
      transparent: true,
      opacity: 0.3,
    }),
  );
  lane.rotation.x = -Math.PI / 2;
  lane.position.set(0, 0.02, roadCenterZ + 1);
  group.add(lane);

  const threshold = new THREE.Mesh(
    new THREE.BoxGeometry(roadWidth + 2, 0.5, 3.2),
    new THREE.MeshStandardMaterial({
      color: 0x627487,
      roughness: 0.55,
      metalness: 0.42,
      emissive: 0x18222f,
      emissiveIntensity: 0.8,
    }),
  );
  threshold.position.set(0, 0.25, ARENA_RADIUS - 0.6);
  threshold.castShadow = true;
  threshold.receiveShadow = true;
  group.add(threshold);

  const leftRail = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.7, roadLength),
    new THREE.MeshStandardMaterial({
      color: 0x56697c,
      roughness: 0.5,
      metalness: 0.55,
    }),
  );
  leftRail.position.set(-(roadWidth * 0.5) - 0.7, 0.85, roadCenterZ);
  leftRail.castShadow = true;
  group.add(leftRail);

  const rightRail = leftRail.clone();
  rightRail.position.x = (roadWidth * 0.5) + 0.7;
  group.add(rightRail);

  const gateLeft = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 5.5, 2.4),
    new THREE.MeshStandardMaterial({
      color: 0x788797,
      roughness: 0.45,
      metalness: 0.7,
    }),
  );
  gateLeft.position.set(-(roadWidth * 0.5) - 0.8, 2.75, ARENA_RADIUS - 1.5);
  gateLeft.castShadow = true;
  group.add(gateLeft);

  const gateRight = gateLeft.clone();
  gateRight.position.x = (roadWidth * 0.5) + 0.8;
  group.add(gateRight);

  return group;
}

function createNorthPillar() {
  const group = new THREE.Group();
  group.position.set(0, 0, -ARENA_RADIUS - 3.5);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 4.6, 2.4, 8),
    new THREE.MeshStandardMaterial({
      color: 0x48515d,
      roughness: 0.72,
      metalness: 0.45,
    }),
  );
  base.position.y = 1.2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 2.25, 13.5, 10),
    new THREE.MeshStandardMaterial({
      color: 0x8d97a6,
      roughness: 0.42,
      metalness: 0.88,
    }),
  );
  pillar.position.y = 8.4;
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  group.add(pillar);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 36, 24),
    new THREE.MeshStandardMaterial({
      color: 0x202942,
      roughness: 0.24,
      metalness: 0.38,
      emissive: 0x0a1220,
      emissiveIntensity: 0.55,
    }),
  );
  head.position.set(0, 14.35, 0);
  head.scale.set(1.3, 0.82, 1.02);
  head.castShadow = true;
  group.add(head);

  const eyeSocket = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 1.6, 0.4),
    new THREE.MeshStandardMaterial({
      color: 0x070a12,
      roughness: 0.5,
      metalness: 0.12,
    }),
  );
  eyeSocket.position.set(0, 14.2, 2.18);
  eyeSocket.castShadow = true;
  group.add(eyeSocket);

  const upperLid = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 1.7, 3.8, 24, 1, false, 0, Math.PI),
    new THREE.MeshBasicMaterial({
      color: 0xf0bd52,
    }),
  );
  upperLid.rotation.z = Math.PI / 2;
  upperLid.rotation.y = Math.PI / 2;
  upperLid.position.set(0, 14.55, 2.34);
  upperLid.scale.set(1, 0.36, 0.3);
  group.add(upperLid);

  const lowerLid = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.45, 3.5, 24, 1, false, 0, Math.PI),
    new THREE.MeshBasicMaterial({
      color: 0xcf8b30,
    }),
  );
  lowerLid.rotation.z = -Math.PI / 2;
  lowerLid.rotation.y = Math.PI / 2;
  lowerLid.position.set(0, 13.82, 2.34);
  lowerLid.scale.set(1, 0.26, 0.24);
  group.add(lowerLid);

  const eyeball = new THREE.Mesh(
    new THREE.SphereGeometry(1.18, 32, 24),
    new THREE.MeshStandardMaterial({
      color: 0xff4d32,
      emissive: 0xff1400,
      emissiveIntensity: 1.7,
      roughness: 0.12,
      metalness: 0.02,
    }),
  );
  eyeball.position.set(0, 14.16, 2.12);
  eyeball.scale.set(1.1, 0.76, 0.3);
  eyeball.castShadow = true;
  group.add(eyeball);

  const pupil = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 1.15, 0.08),
    new THREE.MeshBasicMaterial({
      color: 0x170200,
    }),
  );
  pupil.position.set(0, 14.16, 2.5);
  group.add(pupil);

  const innerGlow = new THREE.PointLight(0xff2a16, 2.6, 24, 2);
  innerGlow.position.set(0, 14.2, 2.1);
  group.add(innerGlow);

  return group;
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
