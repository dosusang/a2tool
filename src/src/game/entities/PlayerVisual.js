import * as THREE from 'three';

export class PlayerVisual {
  constructor(scene, isUserControlled) {
    this.group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.55, 1.4, 6, 12),
      new THREE.MeshStandardMaterial({
        color: isUserControlled ? 0x69d2ff : 0x9dc0ff,
        roughness: 0.35,
        metalness: 0.05,
        emissive: isUserControlled ? 0x0f3950 : 0x101632,
        emissiveIntensity: 0.65,
      }),
    );
    body.castShadow = true;
    body.position.y = 1.3;
    this.group.add(body);

    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.12, 24),
      new THREE.MeshBasicMaterial({
        color: isUserControlled ? 0x76ecff : 0xdce6ff,
        transparent: true,
        opacity: 0.92,
      }),
    );
    marker.position.y = 0.08;
    this.group.add(marker);

    this.buffRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.08, 8, 24),
      new THREE.MeshBasicMaterial({
        color: 0xb376ff,
        transparent: true,
        opacity: 0.95,
      }),
    );
    this.buffRing.rotation.x = Math.PI / 2;
    this.buffRing.position.y = 2.7;
    this.buffRing.visible = false;
    this.group.add(this.buffRing);

    this.label = this.createLabelSprite();
    this.label.position.y = 3.4;
    this.group.add(this.label);

    this.healthBar = this.createHealthBarSprite();
    this.healthBar.position.y = 2.95;
    this.group.add(this.healthBar);

    scene.add(this.group);
  }

  createLabelSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(8, 17, 31, 0.88)';
    context.beginPath();
    context.roundRect(10, 10, 108, 44, 18);
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.18)';
    context.stroke();
    context.fillStyle = '#e5edf8';
    context.font = 'bold 28px Segoe UI';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('1', 64, 34);

    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
      }),
    );
    sprite.scale.set(1.8, 0.9, 1);
    sprite.userData = { canvas, context, texture };
    return sprite;
  }

  setLabel(text) {
    const { canvas, context, texture } = this.label.userData;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(8, 17, 31, 0.88)';
    context.beginPath();
    context.roundRect(10, 10, 108, 44, 18);
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.18)';
    context.stroke();
    context.fillStyle = '#e5edf8';
    context.font = 'bold 28px Segoe UI';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 64, 34);
    texture.needsUpdate = true;
  }

  createHealthBarSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 24;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
      }),
    );
    sprite.scale.set(1.9, 0.36, 1);
    sprite.userData = { canvas, context, texture };
    this.drawHealthBar(sprite, 1);
    return sprite;
  }

  drawHealthBar(sprite, ratio) {
    const { canvas, context, texture } = sprite.userData;
    const width = canvas.width;
    const height = canvas.height;
    const innerX = 8;
    const innerY = 5;
    const innerWidth = width - 16;
    const innerHeight = height - 10;

    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgba(5, 10, 18, 0.88)';
    context.beginPath();
    context.roundRect(4, 2, width - 8, height - 4, 8);
    context.fill();

    context.fillStyle = 'rgba(255,255,255,0.12)';
    context.beginPath();
    context.roundRect(innerX, innerY, innerWidth, innerHeight, 6);
    context.fill();

    const fillWidth = Math.max(0, innerWidth * ratio);
    const gradient = context.createLinearGradient(innerX, 0, innerX + innerWidth, 0);
    gradient.addColorStop(0, ratio <= 0.3 ? '#ff9a5e' : '#78efaa');
    gradient.addColorStop(1, ratio <= 0.3 ? '#ff5572' : '#54d7ff');
    context.fillStyle = gradient;
    context.beginPath();
    context.roundRect(innerX, innerY, fillWidth, innerHeight, 6);
    context.fill();

    texture.needsUpdate = true;
  }

  update(player, elapsedTime) {
    this.group.position.copy(player.position);
    this.group.rotation.y = player.facingYaw;
    this.buffRing.visible = player.buffTimer > 0 && player.alive;
    this.drawHealthBar(this.healthBar, Math.max(0, Math.min(1, player.hp / 100)));
    if (this.buffRing.visible) {
      this.buffRing.rotation.z = elapsedTime * 2.6;
      const pulse = 1 + Math.sin(elapsedTime * 7) * 0.08;
      this.buffRing.scale.setScalar(pulse);
    }
  }

  dispose(scene) {
    scene.remove(this.group);
  }
}
