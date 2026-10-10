import type { MouseEvents, Size } from "../types/game_types";
import Camera from "./camera";

class CanvasRender {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private screenSize: Size; // Canvas Size
  private worldSize: Size;
  private camera: Camera;
  private mouseEvents: MouseEvents;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d");
    this.screenSize = { width: canvas.width, height: canvas.height };
    this.worldSize = { width: 10000, height: 10000 };
    this.camera = new Camera(
      { x: 0, y: 0 },
      { x: this.screenSize.width / 2, y: this.screenSize.height / 2 },
      0.1,
      1.0,
    );
    this.mouseEvents = {
      isClicked: false,
      startPosition: { x: 0, y: 0 },
      endPosition: { x: 0, y: 0 },
    };

    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("mouseup", this.onMouseUp);
  }

  private onMouseDown = (event: MouseEvent) => {
    this.mouseEvents.isClicked = true;
    this.mouseEvents.startPosition = { x: event.x, y: event.y };
    this.mouseEvents.endPosition = this.mouseEvents.startPosition;
  };

  private onMouseMove = (event: MouseEvent) => {
    if (this.mouseEvents.isClicked) {
      this.mouseEvents.endPosition = { x: event.x, y: event.y };
      const movementVector = {
        x: this.mouseEvents.startPosition.x - this.mouseEvents.endPosition.x,
        y: this.mouseEvents.startPosition.y - this.mouseEvents.endPosition.y,
      };
      const cameraCenter = this.camera.getCenter();

      this.camera.setCenter({
        x: cameraCenter.x + movementVector.x,
        y: cameraCenter.y + movementVector.y,
      });

      this.camera.update({
        screenSize: this.screenSize,
        worldSize: this.worldSize,
      });

      this.render();

      this.mouseEvents.startPosition = this.mouseEvents.endPosition;
    }
  };

  private onMouseUp = () => {
    this.mouseEvents.isClicked = false;
  };

  render() {
    if (this.ctx === null) {
      console.log("can not render canvas context is null");

      return;
    }

    this.ctx.clearRect(0, 0, this.screenSize.width, this.screenSize.height);

    this.ctx.save();

    this.ctx.translate(
      -Math.floor(this.camera.getPosition().x),
      -Math.floor(this.camera.getPosition().y),
    );

    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(1000, 1000);
    this.ctx.stroke();

    this.ctx.restore();
  }

  destroy() {
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mouseup", this.onMouseUp);
  }
}

export default CanvasRender;
