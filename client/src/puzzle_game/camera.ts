import type { Position, Size } from "../types/game_types";

interface CameraBounds {
  screenSize: Size;
  worldSize: Size;
}

interface ZoomAnchor {
  screen: Position;
  world: Position;
}

class Camera {
  private position: Position;
  private center: Position;

  private zoom: number;
  private targetZoom: number;
  private zoomAnchor: ZoomAnchor | null;

  private readonly maxZoom = 3;
  private readonly minZoom = 0.5;
  private readonly zoomSensitivity = 0.01;

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
    this.zoomAnchor = null;

    this.zoomSpeed = zoomSpeed;
    this.lerpSpeed = lerpSpeed;
  }

  private resetZoom() {
    this.targetZoom = this.zoom;
    this.zoomAnchor = null;
  }

  getPosition() {
    return this.position;
  }

  getCenter() {
    return this.center;
  }

  setCenter(newCenter: Position) {
    this.resetZoom();
    this.center = { ...newCenter };
  }

  private syncCenter(screenSize: Size) {
    this.center = {
      x: this.position.x + screenSize.width / (2 * this.zoom),
      y: this.position.x + screenSize.height / (2 * this.zoom),
    };
  }

  getZoom() {
    return this.zoom;
  }

  pinchBy(deltaPixels: number, screenAnchor: Position, screenSize: Size) {
    if (!Number.isFinite(deltaPixels) || deltaPixels === 0) {
      return;
    }

    const factor = Math.exp(-deltaPixels * this.zoomSensitivity);

    const nextTargetZoom = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, this.targetZoom * factor),
    );

    console.log("next zoom", nextTargetZoom, "zoom", this.targetZoom);

    if (nextTargetZoom === this.targetZoom) {
      return;
    }

    this.zoomAnchor = {
      screen: { ...screenAnchor },
      world: {
        x: this.position.x + screenAnchor.x / this.zoom,
        y: this.position.y + screenAnchor.y / this.zoom,
      },
    };

    this.syncCenter(screenSize);
    this.targetZoom = nextTargetZoom;
  }

  panBy(delta: Position, bounds: CameraBounds) {
    console.log("here panning");

    if (this.zoomAnchor !== null) {
      this.resetZoom();

      // this.clampPosition(bounds);

      this.syncCenter(bounds.screenSize);
    }

    this.center.x += delta.x / this.zoom;
    this.center.y += delta.y / this.zoom;

    // this.clampCenter(bounds);
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

  private clampPosition({ screenSize, worldSize }: CameraBounds) {
    const visibleSize: Size = {
      width: screenSize.width / this.zoom,
      height: screenSize.height / this.zoom,
    };

    const maxX = Math.max(0, worldSize.width - visibleSize.width);
    const maxY = Math.max(0, worldSize.height - visibleSize.height);

    this.position.x = Math.max(0, Math.min(this.position.x, maxX));
    this.position.y = Math.max(0, Math.min(this.position.y, maxY));
  }

  update({ screenSize, worldSize }: CameraBounds, deltaSeconds: number) {
    const dt = Math.max(0, deltaSeconds);

    if (this.zoomAnchor !== null) {
      const alpha = 1 - Math.exp(-this.zoomSpeed * dt);

      this.zoom += (this.targetZoom - this.zoom) * alpha;
      if (Math.abs(this.targetZoom - this.zoom) < 0.0001) {
        this.zoom = this.targetZoom;
      }

      console.log("actual zoom", this.zoom);

      const { world, screen } = this.zoomAnchor;

      this.position.x = world.x - screen.x / this.zoom;
      this.position.y = world.y - screen.y / this.zoom;

      // this.clampPosition({ screenSize, worldSize });

      // this.clampCenter({ screenSize, worldSize });

      this.syncCenter(screenSize);

      console.log("position", this.position, "center", this.center);

      const moving = this.zoom !== this.targetZoom;

      if (!moving) {
        this.zoomAnchor = null;
      }

      return moving;
    }

    // this.clampCenter({ screenSize, worldSize });

    const visibleSize: Size = {
      width: screenSize.width / this.zoom,
      height: screenSize.height / this.zoom,
    };

    const target: Position = {
      x: this.center.x - visibleSize.width / 2,
      y: this.center.y - visibleSize.height / 2,
    };

    const alpha = 1 - Math.exp(-this.lerpSpeed * dt);

    this.position.x += (target.x - this.position.x) * alpha;
    this.position.y += (target.y - this.position.y) * alpha;

    // this.clampPosition({ screenSize, worldSize });

    if (Math.abs(target.x - this.position.x) * this.zoom < 0.01) {
      this.position.x = target.x;
    }

    if (Math.abs(target.y - this.position.y) * this.zoom < 0.01) {
      this.position.y = target.y;
    }

    return this.position.x !== target.x || this.position.y !== target.y;
  }
}

export default Camera;
