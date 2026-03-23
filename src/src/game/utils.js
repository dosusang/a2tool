import * as THREE from 'three';
import { ORB_COUNT } from './constants.js';

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function damp(current, target, smoothing, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * dt));
}

export function angleForIndex(index) {
  return Math.PI / 2 + (index * Math.PI * 2) / ORB_COUNT;
}

export function directionFromAngle(angle, out = new THREE.Vector3()) {
  out.set(Math.cos(angle), 0, Math.sin(angle));
  return out;
}

export function formatSeconds(value) {
  return `${Math.max(0, value).toFixed(1)}s`;
}

export function getForwardFromYaw(yaw, out = new THREE.Vector3()) {
  out.set(Math.sin(yaw), 0, Math.cos(yaw));
  return out;
}

export function getRightFromYaw(yaw, out = new THREE.Vector3()) {
  out.set(Math.cos(yaw), 0, -Math.sin(yaw));
  return out;
}
