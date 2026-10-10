import type { Position, Size } from "../types/game_types";

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
    this.center = newCenter;
  }

  update({ screenSize, worldSize }: { screenSize: Size; worldSize: Size }) {
    this.zoom += (this.targetZoom - this.zoom) * this.zoomSpeed;

    const visibleSize: Size = {
      width: screenSize.width / this.zoom,
      height: screenSize.height / this.zoom,
    };

    const target: Position = {
      x: this.center.x - visibleSize.width / 2,
      y: this.center.y - visibleSize.height / 2,
    };

    this.position.x = (target.x - this.position.x) * this.lerpSpeed;
    this.position.y = (target.y - this.position.y) * this.lerpSpeed;

    const maxX = worldSize.width - visibleSize.width;
    const maxY = worldSize.height - visibleSize.height;

    this.position.x = Math.max(0, Math.min(this.position.x, maxX));
    this.position.y = Math.max(0, Math.min(this.position.y, maxY));
  }
}

export default Camera;
