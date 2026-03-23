import * as THREE from 'three';
import {
  ARENA_RADIUS,
  GROUND_Y,
  PLAYER_COUNT,
  PLAYER_MAX_HP,
} from './constants.js';

export function createPlayerState(id, isUserControlled) {
  return {
    id,
    isUserControlled,
    hp: PLAYER_MAX_HP,
    alive: true,
    buffTimer: 0,
    position: new THREE.Vector3(),
    previousPosition: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    facingYaw: 0,
    grounded: true,
    isDashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    dashVelocity: new THREE.Vector3(),
    targetPosition: new THREE.Vector3(),
    plannedConsumeTime: 0,
    aiConsumeTriggered: false,
    aiChargeActive: false,
    aiChargeTarget: new THREE.Vector3(),
  };
}

export function createOrbState(index) {
  return {
    index,
    color: 'purple',
    eaten: false,
    reachedOuterRing: false,
    progress: 0,
    position: new THREE.Vector3(),
    previousPosition: new THREE.Vector3(),
  };
}

export function createInitialState(playerId = 1) {
  const players = Array.from({ length: PLAYER_COUNT }, (_, idx) =>
    createPlayerState(idx + 1, idx + 1 === playerId),
  );
  const orbs = Array.from({ length: PLAYER_COUNT }, (_, idx) => createOrbState(idx));

  return {
    selectedPlayerId: playerId,
    players,
    orbs,
    phase: 'idle',
    time: 0,
    nextRequiredOrb: 1,
    lastConsumeTime: null,
    nextConsumeAt: null,
    result: null,
    message: '等待开始',
    triggerRedAt: null,
    bossJumpTime: 0,
    bossSpawnPosition: new THREE.Vector3(0, 0, 0),
    debugLastAnnouncedOrb: 0,
    debugReleasedLogged: false,
    debugLastRedAt: null,
    debugAutoplayAll: false,
    aiReactionMin: 0.1,
    aiReactionMax: 0.6,
    aiReactionDelays: [],
  };
}

export function resetPlayerPositions(state) {
  const scatterMinRadius = ARENA_RADIUS * 0.42;
  const scatterMaxRadius = ARENA_RADIUS * 0.78;

  state.players.forEach((player, idx) => {
    const baseAngle = (-Math.PI / 2) - (idx * Math.PI * 2) / PLAYER_COUNT;
    const angleJitter = (Math.random() - 0.5) * 0.55;
    const radius = scatterMinRadius + Math.random() * (scatterMaxRadius - scatterMinRadius);
    const angle = baseAngle + angleJitter;

    player.position.set(Math.cos(angle) * radius, GROUND_Y, Math.sin(angle) * radius);
    player.previousPosition.copy(player.position);
    player.velocity.set(0, 0, 0);
    player.facingYaw = Math.atan2(-player.position.x, -player.position.z);
    player.hp = PLAYER_MAX_HP;
    player.alive = true;
    player.buffTimer = 0;
    player.grounded = true;
    player.isDashing = false;
    player.dashTimer = 0;
    player.dashCooldown = 0;
    player.dashVelocity.set(0, 0, 0);
    player.targetPosition.copy(player.position);
    player.plannedConsumeTime = 0;
    player.aiConsumeTriggered = false;
    player.aiChargeActive = false;
    player.aiChargeTarget.copy(player.position);
  });
}
