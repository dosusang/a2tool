import * as THREE from 'three';

export class BossVisual {
  constructor(scene) {
    this.group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.8, 3.8, 24),
      new THREE.MeshStandardMaterial({
        color: 0x2b3556,
        roughness: 0.5,
        metalness: 0.1,
        emissive: 0x161d31,
        emissiveIntensity: 1.2,
      }),
    );
    body.castShadow = true;
    body.position.y = 1.9;
    this.group.add(body);

    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.08, 8, 32),
      new THREE.MeshBasicMaterial({
        color: 0x6bd6ff,
        transparent: true,
        opacity: 0.9,
      }),
    );
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 4;
    this.group.add(crown);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.2, 48),
      new THREE.MeshBasicMaterial({
        color: 0x69d2ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.42,
      }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.05;
    this.group.add(this.ring);

    this.dustRing = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.8, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffc57a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0,
      }),
    );
    this.dustRing.rotation.x = -Math.PI / 2;
    this.dustRing.position.y = 0.04;
    this.group.add(this.dustRing);

    scene.add(this.group);
  }

  update(jumpTime, phase, spawnPosition) {
    const active = phase === 'running' || phase === 'success' || phase === 'failure';
    this.group.visible = active;
    if (!active) {
      return;
    }

    const start = spawnPosition ?? new THREE.Vector3(0, 0, 0);
    let x = 0;
    let y = 0;
    let z = 0;
    let scaleY = 1;
    let coreRingScale = 1;
    let coreRingOpacity = 0.18;
    let dustScale = 1;
    let dustOpacity = 0;

    if (jumpTime < 1.0) {
      const t = jumpTime / 1.0;
      x = start.x;
      z = start.z;
      y = -3.2 * easeInOutCubic(t);
      scaleY = 1 - t * 0.28;
    } else if (jumpTime < 2.45) {
      x = 0;
      z = 0;
      y = -3.2;
      scaleY = 0.72;
      dustOpacity = 0.08;
    } else if (jumpTime < 3.25) {
      const t = (jumpTime - 2.45) / 0.8;
      x = 0;
      z = 0;
      y = -3.2 + 3.2 * easeOutBack(t);
      scaleY = 0.72 + t * 0.28;
      coreRingScale = 1.1 + t * 0.9;
      coreRingOpacity = 0.2 + t * 0.28;
      dustScale = 1 + t * 2.2;
      dustOpacity = 0.42 * (1 - t * 0.35);
    } else if (jumpTime < 4.0) {
      const t = (jumpTime - 3.25) / 0.75;
      const hop = Math.sin(t * Math.PI);
      x = 0;
      z = 0;
      y = hop * 2.6;
      scaleY = 1 + hop * 0.08;
      coreRingScale = 2 + hop * 0.8;
      coreRingOpacity = 0.46 - t * 0.12;
      dustScale = 3.2 + t * 3.4;
      dustOpacity = 0.3 * (1 - t);
    } else {
      x = 0;
      z = 0;
      y = 0;
      const settle = Math.min((jumpTime - 4.0) / 0.7, 1);
      const pulse = Math.max(0, 1 - settle);
      coreRingScale = 2.8 + pulse * 1.2;
      coreRingOpacity = 0.18 * pulse;
      dustScale = 6.6 + settle * 0.8;
      dustOpacity = 0;
    }

    this.group.position.set(x, y, z);
    this.group.scale.set(1, scaleY, 1);
    this.ring.scale.setScalar(coreRingScale);
    this.ring.material.opacity = coreRingOpacity;
    this.dustRing.scale.setScalar(dustScale);
    this.dustRing.material.opacity = dustOpacity;
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * ((t - 1) ** 3) + c1 * ((t - 1) ** 2);
}
