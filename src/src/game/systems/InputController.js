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
    this.lastLookX = 0;
    this.lastLookY = 0;
    this.joystickThumb = null;
    this.dashButton = null;
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
      <div class="joystick-zone">
        <div class="joystick-base">
          <div class="joystick-thumb" data-role="joystick-thumb"></div>
        </div>
      </div>
      <button class="mobile-action mobile-dash" data-role="dash-button">冲刺</button>
    `;

    root.append(controls);
    this.joystickThumb = controls.querySelector('[data-role="joystick-thumb"]');
    this.dashButton = controls.querySelector('[data-role="dash-button"]');

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
    } catch {
      // Best effort only.
    }
  }

  updateMobileLayout() {
    if (!this.mobileRoot) {
      return;
    }
    this.mobileRoot.classList.toggle('force-landscape', this.isForcedLandscapePortrait());
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
      const point = this.normalizeTouchPoint(touch);
      const onLeftHalf = point.x < this.getLogicalWidth() * 0.4;
      const onBottomHalf = point.y > this.getLogicalHeight() * 0.45;

      if (this.joystickTouchId === null && onLeftHalf && onBottomHalf) {
        this.joystickTouchId = touch.identifier;
        this.joystickOrigin.x = point.x;
        this.joystickOrigin.y = point.y;
        this.updateJoystick(0, 0);
        continue;
      }

      if (this.lookTouchId === null) {
        this.lookTouchId = touch.identifier;
        this.lastLookX = point.x;
        this.lastLookY = point.y;
      }
    }

    event.preventDefault();
  }

  onTouchMove(event) {
    if (!this.mobileMode) {
      return;
    }

    for (const touch of event.changedTouches) {
      const point = this.normalizeTouchPoint(touch);
      if (touch.identifier === this.joystickTouchId) {
        const dx = point.x - this.joystickOrigin.x;
        const dy = point.y - this.joystickOrigin.y;
        this.updateJoystick(dx, dy);
      } else if (touch.identifier === this.lookTouchId) {
        this.lookDeltaX += point.x - this.lastLookX;
        this.lookDeltaY += point.y - this.lastLookY;
        this.lastLookX = point.x;
        this.lastLookY = point.y;
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

  isForcedLandscapePortrait() {
    return this.mobileMode && window.innerHeight > window.innerWidth;
  }

  getLogicalWidth() {
    return this.isForcedLandscapePortrait() ? window.innerHeight : window.innerWidth;
  }

  getLogicalHeight() {
    return this.isForcedLandscapePortrait() ? window.innerWidth : window.innerHeight;
  }

  normalizeTouchPoint(touch) {
    if (!this.isForcedLandscapePortrait()) {
      return { x: touch.clientX, y: touch.clientY };
    }

    return {
      x: touch.clientY,
      y: window.innerWidth - touch.clientX,
    };
  }
}
