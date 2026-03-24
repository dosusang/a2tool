export class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pointerLocked = false;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.zoomDelta = 0;
    this.jumpPressed = false;
    this.dashPressed = false;
    this.boundHandlers = {
      keydown: (event) => this.onKeyDown(event),
      keyup: (event) => this.onKeyUp(event),
      mousedown: () => this.requestLock(),
      wheel: (event) => this.onWheel(event),
      mousemove: (event) => this.onMouseMove(event),
      pointerlockchange: () => this.onPointerLockChange(),
    };
  }

  attach() {
    window.addEventListener('keydown', this.boundHandlers.keydown);
    window.addEventListener('keyup', this.boundHandlers.keyup);
    this.canvas.addEventListener('mousedown', this.boundHandlers.mousedown);
    this.canvas.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
    document.addEventListener('mousemove', this.boundHandlers.mousemove);
    document.addEventListener('pointerlockchange', this.boundHandlers.pointerlockchange);
  }

  detach() {
    window.removeEventListener('keydown', this.boundHandlers.keydown);
    window.removeEventListener('keyup', this.boundHandlers.keyup);
    this.canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
    this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
    document.removeEventListener('mousemove', this.boundHandlers.mousemove);
    document.removeEventListener('pointerlockchange', this.boundHandlers.pointerlockchange);
  }

  mountMobileControls() {}

  requestLandscape() {}

  updateMobileLayout() {}

  isForcedLandscapePortrait() {
    return false;
  }

  requestLock() {
    if (!this.pointerLocked) {
      this.canvas.requestPointerLock?.();
    }
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

  onWheel(event) {
    this.zoomDelta += Math.sign(event.deltaY);
    event.preventDefault();
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
    return {
      x: (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0),
      y: (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0),
    };
  }

  consumeLookDelta() {
    const delta = { x: this.lookDeltaX, y: this.lookDeltaY };
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    return delta;
  }

  consumeZoomDelta() {
    const delta = this.zoomDelta;
    this.zoomDelta = 0;
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
