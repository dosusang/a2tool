import * as THREE from 'three';
import { createScene } from './scene/createScene.js';
import { PlayerVisual } from './entities/PlayerVisual.js';
import { OrbVisual } from './entities/OrbVisual.js';
import { BossVisual } from './entities/BossVisual.js';
import { InputController } from './systems/InputController.js';
import { CameraRig } from './systems/CameraRig.js';
import { MovementSystem } from './systems/MovementSystem.js';
import { AISystem } from './systems/AISystem.js';
import { MechanicSystem } from './systems/MechanicSystem.js';
import { createInitialState, resetPlayerPositions } from './state.js';
import { createUI } from './ui/createUI.js';
import { AI_REACTION_DELAYS, DEFAULT_DEBUG_AUTOPLAY_ALL, PREP_DURATION } from './constants.js';

export class Game {
  constructor(root) {
    this.root = root;
    this.debugAutoplayAll = DEFAULT_DEBUG_AUTOPLAY_ALL;
    this.selectedPlayerId = 1;
    this.aiReactionMin = 0.1;
    this.aiReactionMax = 0.6;
    this.showMinimapHints = true;
    this.state = this.createState();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.domElement.className = 'sim-canvas';
    this.clock = new THREE.Clock();
    this.playerVisuals = [];
    this.orbVisuals = [];
    this.frameId = 0;
  }

  createState() {
    const state = createInitialState(this.selectedPlayerId);
    state.debugAutoplayAll = this.debugAutoplayAll;
    state.aiReactionMin = this.aiReactionMin;
    state.aiReactionMax = this.aiReactionMax;
    state.showMinimapHints = this.showMinimapHints;
    state.aiReactionDelays = this.generateReactionDelays();
    if (this.debugAutoplayAll) {
      state.players.forEach((player) => {
        player.isUserControlled = false;
      });
    }
    return state;
  }

  generateReactionDelays() {
    return AI_REACTION_DELAYS.map(() => {
      const t = Math.random();
      return this.aiReactionMin + (this.aiReactionMax - this.aiReactionMin) * t;
    });
  }

  init() {
    this.root.className = 'sim-root';
    this.root.appendChild(this.renderer.domElement);

    const { scene, camera } = createScene(this.renderer);
    this.scene = scene;
    this.camera = camera;

    this.input = new InputController(this.renderer.domElement);
    this.input.attach();
    this.input.mountMobileControls(this.root);

    this.cameraRig = new CameraRig(camera);
    this.movementSystem = new MovementSystem(this.cameraRig, this.input);
    this.aiSystem = new AISystem();
    this.mechanicSystem = new MechanicSystem();
    this.bossVisual = new BossVisual(scene);

    this.ui = createUI(this.root, {
      onSelect: (id) => this.selectPlayer(id),
      onSetMode: (debugMode) => this.setMode(debugMode),
      onSetReactionRange: (min, max) => this.setReactionRange(min, max),
      onSetMinimapHints: (enabled) => this.setMinimapHints(enabled),
      onStart: () => this.startChallenge(),
      onRetry: () => this.startChallenge(),
      onBackToSetup: () => this.backToSetup(),
    });

    this.rebuildRoster();
    this.backToSetup();

    window.addEventListener('resize', this.handleResize);
    this.handleResize();
    this.tick();
  }

  handleResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.input?.updateMobileLayout();
  };

  rebuildRoster() {
    this.playerVisuals.forEach((visual) => visual.dispose(this.scene));
    this.orbVisuals.forEach((visual) => visual.dispose(this.scene));
    this.playerVisuals = [];
    this.orbVisuals = [];

    this.state.players.forEach((player) => {
      const visual = new PlayerVisual(this.scene, player.isUserControlled);
      visual.setLabel(`${player.id}`);
      this.playerVisuals.push(visual);
    });

    this.state.orbs.forEach(() => {
      this.orbVisuals.push(new OrbVisual(this.scene));
    });
  }

  setMode(debugMode) {
    this.debugAutoplayAll = debugMode;
    this.backToSetup();
  }

  setReactionRange(min, max) {
    if (typeof min === 'number') {
      this.aiReactionMin = Math.min(min, this.aiReactionMax);
    }
    if (typeof max === 'number') {
      this.aiReactionMax = Math.max(max, this.aiReactionMin);
    }
    this.backToSetup();
  }

  setMinimapHints(enabled) {
    this.showMinimapHints = enabled;
    this.state.showMinimapHints = enabled;
  }

  selectPlayer(id) {
    this.selectedPlayerId = id;
    this.backToSetup();
  }

  startChallenge() {
    this.state = this.createState();
    resetPlayerPositions(this.state);
    this.rebuildRoster();
    this.aiSystem.prepare(this.state);
    this.mechanicSystem.start(this.state);
    this.state.message = this.debugAutoplayAll
      ? `8 AI 演示模式：全员有 ${PREP_DURATION} 秒时间跑位，Boss 会先钻地再从中间破土`
      : `玩家 ${this.selectedPlayerId} 号开始练习`;

    if (this.debugAutoplayAll) {
      console.log('[mechanic] autoplay=all-ai enabled');
    }
    console.log('[mechanic] reaction-delays', this.state.aiReactionDelays.map((v) => v.toFixed(2)).join(', '));
  }

  backToSetup() {
    this.state = this.createState();
    resetPlayerPositions(this.state);
    this.rebuildRoster();
    this.state.phase = 'idle';
    this.state.message = this.debugAutoplayAll
      ? '8 AI 演示模式待命中'
      : '选择编号并开始挑战';
  }

  getCameraFocusPlayer() {
    return this.state.players.find((player) => player.id === this.selectedPlayerId)
      ?? this.state.players.find((player) => player.isUserControlled)
      ?? this.state.players[0];
  }

  tick = () => {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.update(dt);
    this.render();
    this.frameId = requestAnimationFrame(this.tick);
  };

  update(dt) {
    const focusPlayer = this.getCameraFocusPlayer();
    if (!focusPlayer) {
      return;
    }

    if (
      !this.state.debugAutoplayAll
      && (this.state.phase === 'success' || this.state.phase === 'failure')
      && this.input.consumeJump()
    ) {
      this.startChallenge();
      return;
    }

    this.cameraRig.update(focusPlayer, this.input, dt);

    if (this.state.phase === 'running') {
      this.aiSystem.refreshTargets(this.state);

      this.state.players.forEach((player) => {
        const orb = this.state.orbs[player.id - 1];
        if (orb) {
          this.aiSystem.updateConsumeIntent(player, orb, this.state);
        }
      });

      this.state.players.forEach((player) => {
        if (player.isUserControlled && !this.debugAutoplayAll) {
          this.movementSystem.updatePlayer(player, dt);
        } else {
          this.movementSystem.updateAi(player, dt);
        }
      });

      this.mechanicSystem.update(this.state, dt);
      this.mechanicSystem.handleCollisions(this.state);
    }
  }

  render() {
    const focusPlayer = this.getCameraFocusPlayer();
    if (!focusPlayer) {
      return;
    }

    const orbsVisible = this.state.phase === 'running' && this.state.time >= PREP_DURATION;

    this.playerVisuals.forEach((visual, idx) => {
      visual.update(this.state.players[idx], this.state.time);
    });

    this.orbVisuals.forEach((visual, idx) => {
      visual.update(this.state.orbs[idx], this.state.time);
      visual.mesh.visible = orbsVisible && !this.state.orbs[idx].eaten;
    });

    this.bossVisual.update(this.state.bossJumpTime, this.state.phase, this.state.bossSpawnPosition);
    this.ui.render(this.state, focusPlayer, this.cameraRig.planarForward, this.bossVisual.group.position);
    this.renderer.render(this.scene, this.camera);
  }
}
