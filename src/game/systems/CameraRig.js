import * as THREE from 'three';
import {
  CAMERA_DISTANCE,
  CAMERA_DISTANCE_MAX,
  CAMERA_DISTANCE_MIN,
  CAMERA_ZOOM_STEP,
  CAMERA_HEIGHT,
  CAMERA_PITCH_MAX,
  CAMERA_PITCH_MIN,
} from '../constants.js';
import { clamp } from '../utils.js';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = Math.PI;
    this.pitch = -0.3;
    this.lookSensitivity = 0.0028;
    this.distance = CAMERA_DISTANCE;
    this.target = new THREE.Vector3();
    this.planarForward = new THREE.Vector3(0, 0, -1);
    this.planarRight = new THREE.Vector3(1, 0, 0);
    this.upAxis = new THREE.Vector3(0, 1, 0);
  }

  update(player, input) {
    const lookDelta = input.consumeLookDelta();
    const zoomDelta = input.consumeZoomDelta();
    this.yaw -= lookDelta.x * this.lookSensitivity;
    this.pitch = clamp(this.pitch - lookDelta.y * this.lookSensitivity, CAMERA_PITCH_MIN, CAMERA_PITCH_MAX);
    this.distance = clamp(
      this.distance + zoomDelta * CAMERA_ZOOM_STEP,
      CAMERA_DISTANCE_MIN,
      CAMERA_DISTANCE_MAX,
    );

    this.target.copy(player.position);
    this.target.y += CAMERA_HEIGHT;

    const direction = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    const desiredPosition = this.target.clone().sub(direction.multiplyScalar(this.distance));

    this.camera.position.copy(desiredPosition);
    this.camera.lookAt(this.target);

    this.planarForward.copy(this.target).sub(this.camera.position);
    this.planarForward.y = 0;
    if (this.planarForward.lengthSq() > 0.0001) {
      this.planarForward.normalize();
      this.planarRight.crossVectors(this.planarForward, this.upAxis).normalize();
    }
  }
}
