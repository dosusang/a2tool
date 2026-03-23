import * as THREE from 'three';
import {
  AI_CHARGE_SPEED,
  AI_MOVE_SPEED,
  AI_REPOSITION_DASH_DISTANCE,
  AIR_CONTROL,
  ARENA_RADIUS,
  DASH_COOLDOWN,
  DASH_DISTANCE,
  DASH_DURATION,
  GRAVITY,
  GROUND_Y,
  JUMP_SPEED,
  MOVE_SPEED,
} from '../constants.js';

const desired = new THREE.Vector3();
const fallbackForward = new THREE.Vector3(0, 0, -1);
const fallbackRight = new THREE.Vector3(1, 0, 0);

export class MovementSystem {
  constructor(cameraRig, input) {
    this.cameraRig = cameraRig;
    this.input = input;
  }

  updatePlayer(player, dt) {
    if (!player.alive) {
      return;
    }

    player.previousPosition.copy(player.position);

    const axes = this.input.getMoveAxes();
    const forward = this.cameraRig.planarForward.lengthSq() > 0.0001
      ? this.cameraRig.planarForward
      : fallbackForward;
    const right = this.cameraRig.planarRight.lengthSq() > 0.0001
      ? this.cameraRig.planarRight
      : fallbackRight;

    desired.set(0, 0, 0);
    desired.addScaledVector(forward, axes.y);
    desired.addScaledVector(right, axes.x);
    if (desired.lengthSq() > 1) {
      desired.normalize();
    }

    if (this.input.consumeJump() && player.grounded) {
      player.velocity.y = JUMP_SPEED;
      player.grounded = false;
    }

    if (player.dashCooldown > 0) {
      player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    }

    if (this.input.consumeDash() && player.dashCooldown <= 0) {
      const dashDirection = desired.lengthSq() > 0
        ? desired.clone()
        : forward.clone().negate();
      player.isDashing = true;
      player.dashTimer = DASH_DURATION;
      player.dashCooldown = DASH_COOLDOWN;
      player.dashVelocity.copy(dashDirection.normalize().multiplyScalar(DASH_DISTANCE / DASH_DURATION));
    }

    if (player.isDashing) {
      player.position.addScaledVector(player.dashVelocity, dt);
      player.dashTimer -= dt;
      if (player.dashTimer <= 0) {
        player.isDashing = false;
      }
    } else {
      const control = player.grounded ? 1 : AIR_CONTROL;
      const moveDelta = desired.clone().multiplyScalar(MOVE_SPEED * control * dt);
      player.position.add(moveDelta);
    }

    if (desired.lengthSq() > 0.0001) {
      player.facingYaw = Math.atan2(desired.x, desired.z);
    }

    if (!player.grounded || player.velocity.y > 0) {
      player.velocity.y -= GRAVITY * dt;
      player.position.y += player.velocity.y * dt;
      if (player.position.y <= GROUND_Y) {
        player.position.y = GROUND_Y;
        player.velocity.y = 0;
        player.grounded = true;
      }
    }

    const distance = Math.hypot(player.position.x, player.position.z);
    const maxRadius = ARENA_RADIUS - 1.2;
    if (distance > maxRadius) {
      const scale = maxRadius / distance;
      player.position.x *= scale;
      player.position.z *= scale;
    }
  }

  updateAi(player, dt) {
    if (!player.alive || player.isUserControlled) {
      return;
    }

    player.previousPosition.copy(player.position);

    if (player.dashCooldown > 0) {
      player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    }

    const destination = player.aiChargeActive ? player.aiChargeTarget : player.targetPosition;
    const delta = desired.copy(destination).sub(player.position);
    delta.y = 0;
    const distance = delta.length();

    if (!player.aiChargeActive && !player.isDashing && player.dashCooldown <= 0 && distance >= AI_REPOSITION_DASH_DISTANCE) {
      player.isDashing = true;
      player.dashTimer = DASH_DURATION;
      player.dashCooldown = DASH_COOLDOWN;
      player.dashVelocity.copy(delta.normalize().multiplyScalar(DASH_DISTANCE / DASH_DURATION));
    }

    if (player.isDashing) {
      player.position.addScaledVector(player.dashVelocity, dt);
      player.dashTimer -= dt;
      if (player.dashTimer <= 0) {
        player.isDashing = false;
      }
    } else if (distance > 0.05) {
      delta.normalize();
      const moveSpeed = player.aiChargeActive ? AI_CHARGE_SPEED : AI_MOVE_SPEED;
      const step = Math.min(distance, moveSpeed * dt);
      player.position.addScaledVector(delta, step);
      if (player.aiChargeActive && distance <= 0.2) {
        player.aiChargeActive = false;
      }
    }

    player.facingYaw = Math.atan2(-player.position.x, -player.position.z);

    if (!player.grounded || player.velocity.y > 0) {
      player.velocity.y -= GRAVITY * dt;
      player.position.y += player.velocity.y * dt;
      if (player.position.y <= GROUND_Y) {
        player.position.y = GROUND_Y;
        player.velocity.y = 0;
        player.grounded = true;
      }
    }

    const arenaDistance = Math.hypot(player.position.x, player.position.z);
    const maxRadius = ARENA_RADIUS - 1.2;
    if (arenaDistance > maxRadius) {
      const scale = maxRadius / arenaDistance;
      player.position.x *= scale;
      player.position.z *= scale;
    }
  }
}
