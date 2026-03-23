export class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pointerLocked = false;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.jumpPressed = false;
    this.dashPressed = false;
    this.virtualMove = { x: 0, y: 0 };
    this.mobileRoot = null;
    this.mobileMode = matchMedia('(pointer: coarse)').matches;
    this.joystickTouchId = null;
    this.lookTouchId = null;
    this.joystickOrigin = { x: 0, y: 0 };
    this.joystickThumb = null;
    this.dashButton = null;
    this.rotateOverlay = null;
    this.boundHandlers = {
      keydown: (event) => this.onKeyDown(event),
      keyup: (event) => this.onKeyUp(event),
      mousedown: () => this.requestLock(),
      mousemove: (event) => this.onMouseMove(event),
      pointerlockchange: () => this.onPointerLockChange(),
      touchstart: (event) => this.onTouchStart(event),
      touchmove: (event) => this.onTouchMove(event),
      touchend: (event) => this.onTouchEnd(event),
      touchcancel: (event) => this.onTouchEnd(event),
    };
  }

  attach() {
    window.addEventListener('keydown', this.boundHandlers.keydown);
    window.addEventListener('keyup', this.boundHandlers.keyup);
    this.canvas.addEventListener('mousedown', this.boundHandlers.mousedown);
    document.addEventListener('mousemove', this.boundHandlers.mousemove);
    document.addEventListener('pointerlockchange', this.boundHandlers.pointerlockchange);
    this.canvas.addEventListener('touchstart', this.boundHandlers.touchstart, { passive: false });
    this.canvas.addEventListener('touchmove', this.boundHandlers.touchmove, { passive: false });
    this.canvas.addEventListener('touchend', this.boundHandlers.touchend, { passive: false });
    this.canvas.addEventListener('touchcancel', this.boundHandlers.touchcancel, { passive: false });
  }

  mountMobileControls(root) {
    this.mobileRoot = root;
    const controls = document.createElement('div');
    controls.className = 'mobile-controls';
    controls.innerHTML = `
      <div class="joystick-zone" data-role="joystick-zone">
        <div class="joystick-base">
          <div class="joystick-thumb" data-role="joystick-thumb"></div>
        </div>
      </div>
      <button class="mobile-action mobile-dash" data-role="dash-button">冲刺</button>
    `;

    const rotateOverlay = document.createElement('div');
    rotateOverlay.className = 'rotate-overlay';
    rotateOverlay.innerHTML = `
      <div class="rotate-card">
        <strong>请横屏</strong>
        <span>横屏后更适合第三人称移动与视角操作</span>
      </div>
    `;

    root.append(controls, rotateOverlay);
    this.joystickThumb = controls.querySelector('[data-role="joystick-thumb"]');
    this.dashButton = controls.querySelector('[data-role="dash-button"]');
    this.rotateOverlay = rotateOverlay;

    this.dashButton.addEventListener('touchstart', (event) => {
      event.preventDefault();
      this.dashPressed = true;
    }, { passive: false });
  }

  detach() {
    window.removeEventListener('keydown', this.boundHandlers.keydown);
    window.removeEventListener('keyup', this.boundHandlers.keyup);
    this.canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
    document.removeEventListener('mousemove', this.boundHandlers.mousemove);
    document.removeEventListener('pointerlockchange', this.boundHandlers.pointerlockchange);
    this.canvas.removeEventListener('touchstart', this.boundHandlers.touchstart);
    this.canvas.removeEventListener('touchmove', this.boundHandlers.touchmove);
    this.canvas.removeEventListener('touchend', this.boundHandlers.touchend);
    this.canvas.removeEventListener('touchcancel', this.boundHandlers.touchcancel);
  }

  requestLock() {
    if (!this.pointerLocked && !this.mobileMode) {
      this.canvas.requestPointerLock?.();
    }
  }

  async requestLandscape() {
    if (!this.mobileMode) {
      return;
    }
    try {
      if (document.fullscreenElement == null) {
        await this.mobileRoot?.requestFullscreen?.();
      }
      await screen.orientation?.lock?.('landscape');
    } catch {
      // Best effort only.
    }
  }

  updateMobileLayout() {
    if (!this.rotateOverlay) {
      return;
    }
    const portrait = this.mobileMode && window.innerHeight > window.innerWidth;
    this.rotateOverlay.hidden = !portrait;
  }

  onPointerLockChange() {
    this.pointerLocked = document.pointerLockElement === this.canvas;
    this.canvas.classList.toggle('is-locked', this.pointerLocked);
  }

  onMouseMove(event) {
    if (!this.pointerLocked) {
      return;
    }

    this.lookDeltaX += event.movementX;
    this.lookDeltaY += event.movementY;
  }

  onTouchStart(event) {
    if (!this.mobileMode) {
      return;
    }

    for (const touch of event.changedTouches) {
      const onLeftHalf = touch.clientX < window.innerWidth * 0.4;
      const onBottomHalf = touch.clientY > window.innerHeight * 0.45;

      if (this.joystickTouchId === null && onLeftHalf && onBottomHalf) {
        this.joystickTouchId = touch.identifier;
        this.joystickOrigin.x = touch.clientX;
        this.joystickOrigin.y = touch.clientY;
        this.updateJoystick(0, 0);
        continue;
      }

      if (this.lookTouchId === null) {
        this.lookTouchId = touch.identifier;
        this.lastLookX = touch.clientX;
        this.lastLookY = touch.clientY;
      }
    }

    event.preventDefault();
  }

  onTouchMove(event) {
    if (!this.mobileMode) {
      return;
    }

    for (const touch of event.changedTouches) {
      if (touch.identifier === this.joystickTouchId) {
        const dx = touch.clientX - this.joystickOrigin.x;
        const dy = touch.clientY - this.joystickOrigin.y;
        this.updateJoystick(dx, dy);
      } else if (touch.identifier === this.lookTouchId) {
        this.lookDeltaX += touch.clientX - this.lastLookX;
        this.lookDeltaY += touch.clientY - this.lastLookY;
        this.lastLookX = touch.clientX;
        this.lastLookY = touch.clientY;
      }
    }

    event.preventDefault();
  }

  onTouchEnd(event) {
    if (!this.mobileMode) {
      return;
    }

    for (const touch of event.changedTouches) {
      if (touch.identifier === this.joystickTouchId) {
        this.joystickTouchId = null;
        this.updateJoystick(0, 0);
      }
      if (touch.identifier === this.lookTouchId) {
        this.lookTouchId = null;
      }
    }

    event.preventDefault();
  }

  updateJoystick(dx, dy) {
    const maxRadius = 38;
    const length = Math.hypot(dx, dy);
    const clamped = length > maxRadius ? maxRadius / length : 1;
    const x = dx * clamped;
    const y = dy * clamped;

    this.virtualMove.x = x / maxRadius;
    this.virtualMove.y = -y / maxRadius;

    if (this.joystickThumb) {
      this.joystickThumb.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  onKeyDown(event) {
    this.keys.add(event.code);
    if (event.code === 'Space') {
      this.jumpPressed = true;
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      this.dashPressed = true;
    }
  }

  onKeyUp(event) {
    this.keys.delete(event.code);
  }

  getMoveAxes() {
    const keyboardX = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const keyboardY = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const x = Math.abs(this.virtualMove.x) > 0.01 ? this.virtualMove.x : keyboardX;
    const y = Math.abs(this.virtualMove.y) > 0.01 ? this.virtualMove.y : keyboardY;
    return { x, y };
  }

  consumeLookDelta() {
    const delta = { x: this.lookDeltaX, y: this.lookDeltaY };
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    return delta;
  }

  consumeJump() {
    const pressed = this.jumpPressed;
    this.jumpPressed = false;
    return pressed;
  }

  consumeDash() {
    const pressed = this.dashPressed;
    this.dashPressed = false;
    return pressed;
  }
}
