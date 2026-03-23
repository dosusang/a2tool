import {
  AI_FIRST_EAT_TIME,
  AI_OUTER_WAIT_MARGIN,
  AI_STAGING_RADIUS,
  ORB_OUTER_RADIUS,
  PREP_DURATION,
} from '../constants.js';
import { angleForIndex, directionFromAngle } from '../utils.js';

const targetDir = directionFromAngle(0);

export class AISystem {
  prepare(state) {
    state.players.forEach((player) => {
      player.aiConsumeTriggered = false;
      player.aiChargeActive = false;
    });
    this.refreshTargets(state);
  }

  refreshTargets(state) {
    state.players.forEach((player) => {
      const orb = state.orbs[player.id - 1];
      if (orb.eaten) {
        player.plannedConsumeTime = 0;
        player.aiConsumeTriggered = false;
        player.aiChargeActive = false;
        player.targetPosition.copy(this.getSectorPoint(player.id, AI_STAGING_RADIUS));
        return;
      }

      const waitRadius = Math.min(ORB_OUTER_RADIUS - 0.8, orb.progress * ORB_OUTER_RADIUS + AI_OUTER_WAIT_MARGIN);
      player.targetPosition.copy(this.getSectorPoint(player.id, Math.max(AI_STAGING_RADIUS, waitRadius)));

      if (player.id === state.nextRequiredOrb) {
        player.plannedConsumeTime = this.getCurrentConsumeTime(state);
      } else {
        player.plannedConsumeTime = 0;
        player.aiConsumeTriggered = false;
        player.aiChargeActive = false;
      }
    });
  }

  getCurrentConsumeTime(state) {
    if (state.nextRequiredOrb <= 1) {
      return PREP_DURATION + AI_FIRST_EAT_TIME;
    }
    const delay = state.aiReactionDelays[state.nextRequiredOrb - 2] ?? state.aiReactionMax;
    return state.lastConsumeTime + 1 + delay;
  }

  getSectorPoint(playerId, radius) {
    directionFromAngle(angleForIndex(playerId - 1), targetDir);
    return targetDir.clone().multiplyScalar(radius);
  }

  updateConsumeIntent(player, orb, state) {
    if ((!state.debugAutoplayAll && player.isUserControlled) || !player.alive || orb.eaten) {
      return;
    }

    if (player.id !== state.nextRequiredOrb || orb.index !== player.id - 1) {
      return;
    }

    if (state.time < PREP_DURATION || state.triggerRedAt !== null || state.nextConsumeAt === null) {
      return;
    }

    const consumeTime = this.getCurrentConsumeTime(state);
    const onSchedule = state.time >= consumeTime;
    const nearHold = player.position.distanceTo(player.targetPosition) < 1.2;

    if (onSchedule && nearHold && !player.aiConsumeTriggered) {
      player.aiConsumeTriggered = true;
      player.aiChargeActive = true;
      player.aiChargeTarget.copy(orb.position);
    }
  }
}
