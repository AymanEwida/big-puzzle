import type { Position, Size } from "../types/game_types";

interface CameraBounds {
  screenSize: Size;
  worldSize: Size;
}

class Camera {
  private position: Position;
  private center: Position;
  private zoom: number;
  private targetZoom: number;
  private zoomSpeed: number;
  private lerpSpeed: number;

  constructor(
    position: Position,
    center: Position,
    zoomSpeed: number,
    lerpSpeed: number,
  ) {
    this.position = position;
    this.center = center;
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.zoomSpeed = zoomSpeed;
    this.lerpSpeed = lerpSpeed;
  }

  getPosition() {
    return this.position;
  }

  getCenter() {
    return this.center;
  }

  setCenter(newCenter: Position) {
    this.center = { ...newCenter };
  }

  getZoom() {
    return this.zoom;
  }

  panBy(delta: Position, bounds: CameraBounds) {
    this.center.x += delta.x / this.zoom;
    this.center.y += delta.y / this.zoom;

    this.clampCenter(bounds);
  }

  private clampCenter({ screenSize, worldSize }: CameraBounds) {
    const halfWidth = screenSize.width / this.zoom / 2;
    const halfHeight = screenSize.height / this.zoom / 2;

    this.center.x = Math.max(
      halfWidth,
      Math.min(this.center.x, Math.max(halfWidth, worldSize.width - halfWidth)),
    );

    this.center.y = Math.max(
      halfHeight,
      Math.min(
        this.center.y,
        Math.max(halfHeight, worldSize.height - halfHeight),
      ),
    );
  }

  update({ screenSize, worldSize }: CameraBounds, deltaSeconds: number) {
    const zoomAlpha = 1 - Math.exp(-this.zoomSpeed * deltaSeconds);
    const positionAlpha = 1 - Math.exp(-this.lerpSpeed * deltaSeconds);

    this.zoom += (this.targetZoom - this.zoom) * zoomAlpha;
    if (Math.abs(this.targetZoom - this.zoom) < 0.0001) {
      this.zoom = this.targetZoom;
    }

    this.clampCenter({ screenSize, worldSize });

    const visibleSize: Size = {
      width: screenSize.width / this.zoom,
      height: screenSize.height / this.zoom,
    };

    const target: Position = {
      x: this.center.x - visibleSize.width / 2,
      y: this.center.y - visibleSize.height / 2,
    };

    this.position.x += (target.x - this.position.x) * positionAlpha;
    this.position.y += (target.y - this.position.y) * positionAlpha;

    const maxX = Math.max(0, worldSize.width - visibleSize.width);
    const maxY = Math.max(0, worldSize.height - visibleSize.height);

    this.position.x = Math.max(0, Math.min(this.position.x, maxX));
    this.position.y = Math.max(0, Math.min(this.position.y, maxY));

    if (Math.abs(target.x - this.position.x) * this.zoom < 0.01) {
      this.position.x = target.x;
    }

    if (Math.abs(target.y - this.position.y) * this.zoom < 0.01) {
      this.position.y = target.y;
    }

    return (
      this.position.x !== target.x ||
      this.position.y !== target.y ||
      this.zoom !== this.targetZoom
    );
  }
}

export default Camera;
