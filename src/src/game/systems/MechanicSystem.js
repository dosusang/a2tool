import * as THREE from 'three';
import {
  AI_FIRST_EAT_TIME,
  DEBUG_VERBOSE_LOGS,
  ORB_OUTER_RADIUS,
  ORB_RADIUS,
  ORB_TRAVEL_TIME,
  PLAYER_BUFF_DURATION,
  PLAYER_RADIUS,
  PREP_DURATION,
  RED_ORB_DAMAGE,
} from '../constants.js';
import { angleForIndex, directionFromAngle, formatSeconds } from '../utils.js';

const orbDirection = directionFromAngle(0);
const segment = new THREE.Vector3();
const toCenter = new THREE.Vector3();
const segmentA = new THREE.Vector3();
const segmentB = new THREE.Vector3();
const between = new THREE.Vector3();

export class MechanicSystem {
  start(state) {
    state.phase = 'running';
    state.result = null;
    state.message = '机制开始，4 秒内先跑到各自扇区待命';
    state.time = 0;
    state.nextRequiredOrb = 1;
    state.lastConsumeTime = null;
    state.nextConsumeAt = PREP_DURATION + AI_FIRST_EAT_TIME;
    state.triggerRedAt = null;
    state.bossJumpTime = 0;
    state.debugLastAnnouncedOrb = 0;
    state.debugReleasedLogged = false;
    state.debugLastRedAt = null;
    state.bossSpawnPosition = randomBossSpawn();

    state.orbs.forEach((orb, index) => {
      orb.index = index;
      orb.color = 'purple';
      orb.eaten = false;
      orb.reachedOuterRing = false;
      orb.progress = 0;
      orb.position.set(0, 1.25, 0);
      orb.previousPosition.copy(orb.position);
    });

    this.log(
      `start prep=4.00 releaseAt=${PREP_DURATION.toFixed(2)} firstEatAt=${(PREP_DURATION + AI_FIRST_EAT_TIME).toFixed(2)}`,
    );
  }

  update(state, dt) {
    if (state.phase !== 'running') {
      return;
    }

    state.time += dt;
    state.bossJumpTime += dt;

    const orbElapsed = Math.max(0, state.time - PREP_DURATION);
    const orbsReleased = state.time >= PREP_DURATION;

    if (!orbsReleased) {
      state.message = `跑位阶段，还剩 ${formatSeconds(PREP_DURATION - state.time)} 进入放球`;
    } else if (!state.debugReleasedLogged) {
      state.debugReleasedLogged = true;
      this.log(`release t=${state.time.toFixed(2)}`);
    }

    if (state.debugLastAnnouncedOrb !== state.nextRequiredOrb && state.nextRequiredOrb <= 8) {
      state.debugLastAnnouncedOrb = state.nextRequiredOrb;
      this.log(
        `expect orb=${state.nextRequiredOrb} lastConsume=${fmtTime(state.lastConsumeTime)} nextConsumeAt=${fmtTime(state.nextConsumeAt)} redUntil=${fmtTime(state.triggerRedAt)}`,
      );
    }

    state.orbs.forEach((orb) => {
      if (orb.eaten) {
        return;
      }

      orb.previousPosition.copy(orb.position);
      orb.progress = orbsReleased ? Math.min(1, orbElapsed / ORB_TRAVEL_TIME) : 0;
      directionFromAngle(angleForIndex(orb.index), orbDirection);
      orb.position.copy(orbDirection).multiplyScalar(orb.progress * ORB_OUTER_RADIUS);
      orb.position.y = 1.25;

      if (orbsReleased && orb.progress >= 1 && !orb.reachedOuterRing) {
        orb.reachedOuterRing = true;
        this.fail(state, '有球到达最外圈，团队瞬间团灭');
      }
    });

    if (orbsReleased && state.triggerRedAt !== null) {
      if (state.debugLastRedAt !== state.triggerRedAt) {
        state.debugLastRedAt = state.triggerRedAt;
        this.log(
          `all-red start=${(state.lastConsumeTime ?? state.time).toFixed(2)} redUntil=${state.triggerRedAt.toFixed(2)} remaining=${remainingOrbIds(state)}`,
        );
      }

      if (state.time >= state.triggerRedAt) {
        state.orbs.forEach((orb) => {
          if (!orb.eaten) {
            orb.color = 'purple';
          }
        });
        this.log(`all-red end t=${state.time.toFixed(2)} next=${state.nextRequiredOrb}`);
        state.triggerRedAt = null;
        state.message = `红球阶段结束，等待 ${state.nextRequiredOrb} 号在反应窗口内处理`;
      } else {
        state.orbs.forEach((orb) => {
          if (!orb.eaten) {
            orb.color = 'red';
          }
        });
      }
    }

    state.players.forEach((player) => {
      if (player.buffTimer > 0) {
        player.buffTimer = Math.max(0, player.buffTimer - dt);
      }
    });
  }

  handleCollisions(state) {
    if (state.phase !== 'running' || state.time < PREP_DURATION) {
      return;
    }

    if (state.triggerRedAt !== null) {
      for (const player of state.players) {
        if (!player.alive) {
          continue;
        }

        for (const orb of state.orbs) {
          if (orb.eaten || orb.color !== 'red') {
            continue;
          }

          if (!this.isPlayerTouchingOrb(player, orb)) {
            continue;
          }

          this.consumeOrb(state, player, orb);
          return;
        }
      }
      return;
    }

    if (state.nextConsumeAt !== null && state.time < state.nextConsumeAt) {
      return;
    }

    if (state.debugAutoplayAll) {
      const player = state.players.find((candidate) => candidate.id === state.nextRequiredOrb);
      const orb = state.orbs[state.nextRequiredOrb - 1];
      if (!player || !orb || !player.alive || orb.eaten) {
        return;
      }

      if (this.isPlayerTouchingOrb(player, orb)) {
        this.consumeOrb(state, player, orb);
      }
      return;
    }

    for (const player of state.players) {
      if (!player.alive) {
        continue;
      }

      for (const orb of state.orbs) {
        if (orb.eaten) {
          continue;
        }

        if (!this.isPlayerTouchingOrb(player, orb)) {
          continue;
        }

        this.consumeOrb(state, player, orb);
        return;
      }
    }
  }

  consumeOrb(state, player, orb) {
    if (player.buffTimer > 0) {
      player.hp = 0;
      player.alive = false;
      this.fail(state, `玩家 ${player.id} 带着 Buff 再碰球，直接阵亡`);
      return;
    }

    const expectedOrb = state.nextRequiredOrb;
    const ateRed = orb.color === 'red';
    orb.eaten = true;
    player.buffTimer = PLAYER_BUFF_DURATION;

    if (ateRed) {
      state.players.forEach((member) => {
        member.hp = Math.max(0, member.hp - RED_ORB_DAMAGE);
        if (member.hp <= 0) {
          member.alive = false;
        }
      });
    }

    state.lastConsumeTime = state.time;
    this.log(
      `consume t=${state.time.toFixed(2)} player=${player.id} orb=${orb.index + 1} color=${orb.color} expected=${expectedOrb}`,
    );

    if (player.id !== expectedOrb || orb.index + 1 !== expectedOrb) {
      state.message = `顺序错误，当前应由 ${expectedOrb} 号先吃`;
    } else {
      state.nextRequiredOrb += 1;
      state.message = `玩家 ${player.id} 吃到球，剩余球全红 1 秒`;
    }

    if (state.players.some((member) => member.hp <= 0)) {
      this.fail(state, '队伍血量归零，挑战失败');
      return;
    }

    if (state.orbs.every((candidate) => candidate.eaten)) {
      state.phase = 'success';
      const detail = state.debugAutoplayAll
        ? '8 颗球都按顺序处理完毕。'
        : '8 颗球都按顺序处理完毕。按空格可以快速重开。';
      const message = state.debugAutoplayAll
        ? '机制完成'
        : '机制完成，按空格快速重开';
      state.result = {
        title: '机制完成',
        detail,
      };
      state.message = message;
      this.log(`success t=${state.time.toFixed(2)}`);
      return;
    }

    state.orbs.forEach((candidate) => {
      if (!candidate.eaten) {
        candidate.color = 'red';
      }
    });
    state.triggerRedAt = state.time + 1;
    state.nextConsumeAt = this.computeNextConsumeAt(state);
    this.log(
      `lock-start t=${state.time.toFixed(2)} redUntil=${state.triggerRedAt.toFixed(2)} next=${state.nextRequiredOrb} nextConsumeAt=${fmtTime(state.nextConsumeAt)}`,
    );
  }

  computeNextConsumeAt(state) {
    if (state.nextRequiredOrb > 8) {
      return null;
    }

    if (state.nextRequiredOrb === 1) {
      return PREP_DURATION + AI_FIRST_EAT_TIME;
    }

    const delay = state.aiReactionDelays[state.nextRequiredOrb - 2] ?? state.aiReactionMax;
    return state.lastConsumeTime + 1 + delay;
  }

  fail(state, detail) {
    state.phase = 'failure';
    const decoratedDetail = state.debugAutoplayAll
      ? detail
      : `${detail} 按空格可以快速重开。`;
    const message = state.debugAutoplayAll
      ? detail
      : `${detail} 按空格快速重开`;
    state.result = {
      title: '挑战失败',
      detail: decoratedDetail,
    };
    state.message = message;
    this.log(`fail t=${state.time.toFixed(2)} detail=${detail}`);
  }

  log(message) {
    if (DEBUG_VERBOSE_LOGS) {
      console.log(`[mechanic] ${message}`);
    }
  }

  isPlayerTouchingOrb(player, orb) {
    const radius = PLAYER_RADIUS + ORB_RADIUS;
    if (player.position.distanceToSquared(orb.position) <= radius * radius) {
      return true;
    }
    if (player.previousPosition.distanceToSquared(player.position) <= 1e-6
      && orb.previousPosition.distanceToSquared(orb.position) <= 1e-6) {
      return false;
    }

    return distanceSegmentToSegmentSquared(
      player.previousPosition,
      player.position,
      orb.previousPosition,
      orb.position,
    ) <= radius * radius;
  }
}

function fmtTime(value) {
  return value === null ? 'null' : value.toFixed(2);
}

function remainingOrbIds(state) {
  return state.orbs
    .filter((orb) => !orb.eaten)
    .map((orb) => orb.index + 1)
    .join(',');
}

function randomBossSpawn() {
  const angle = Math.random() * Math.PI * 2;
  const radius = 10 + Math.random() * 18;
  return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
}

function distancePointToSegmentSquared(point, start, end) {
  segment.copy(end).sub(start);
  const lengthSq = segment.lengthSq();
  if (lengthSq <= 1e-6) {
    return point.distanceToSquared(start);
  }

  toCenter.copy(point).sub(start);
  const t = THREE.MathUtils.clamp(toCenter.dot(segment) / lengthSq, 0, 1);
  toCenter.copy(start).addScaledVector(segment, t);
  return point.distanceToSquared(toCenter);
}

function distanceSegmentToSegmentSquared(a0, a1, b0, b1) {
  segmentA.copy(a1).sub(a0);
  segmentB.copy(b1).sub(b0);
  between.copy(a0).sub(b0);

  const a = segmentA.dot(segmentA);
  const e = segmentB.dot(segmentB);
  const f = segmentB.dot(between);

  let s = 0;
  let t = 0;

  if (a <= 1e-6 && e <= 1e-6) {
    return a0.distanceToSquared(b0);
  }

  if (a <= 1e-6) {
    t = THREE.MathUtils.clamp(f / e, 0, 1);
  } else {
    const c = segmentA.dot(between);
    if (e <= 1e-6) {
      s = THREE.MathUtils.clamp(-c / a, 0, 1);
    } else {
      const b = segmentA.dot(segmentB);
      const denom = a * e - b * b;
      if (denom !== 0) {
        s = THREE.MathUtils.clamp((b * f - c * e) / denom, 0, 1);
      }
      t = (b * s + f) / e;

      if (t < 0) {
        t = 0;
        s = THREE.MathUtils.clamp(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = THREE.MathUtils.clamp((b - c) / a, 0, 1);
      }
    }
  }

  const closestA = segmentA.clone().multiplyScalar(s).add(a0);
  const closestB = segmentB.clone().multiplyScalar(t).add(b0);
  return closestA.distanceToSquared(closestB);
}
