import * as THREE from 'three';

export class OrbVisual {
  constructor(scene) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xb376ff,
        emissive: 0x5f239e,
        emissiveIntensity: 1.15,
        roughness: 0.2,
        metalness: 0.05,
      }),
    );
    this.mesh.castShadow = true;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  update(orb, elapsedTime) {
    this.mesh.visible = !orb.eaten;
    if (!this.mesh.visible) {
      return;
    }

    this.mesh.position.copy(orb.position);
    const pulse = 1 + Math.sin(elapsedTime * 6 + orb.index) * 0.08;
    this.mesh.scale.setScalar(pulse);

    if (orb.color === 'red') {
      this.mesh.material.color.setHex(0xff5278);
      this.mesh.material.emissive.setHex(0x8b1932);
    } else {
      this.mesh.material.color.setHex(0xb376ff);
      this.mesh.material.emissive.setHex(0x5f239e);
    }
  }

  dispose(scene) {
    scene.remove(this.mesh);
  }
}
