import type { Position, Size } from "../types/game_types";
import Camera from "./camera";

class CanvasRender {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private screenSize: Size; // CSS pixels not bitmap resolution.
  private worldSize: Size = { width: 10000, height: 10000 };
  private camera: Camera;
  private pointerId: number | null = null;
  private lastPointer: Position = { x: 0, y: 0 };
  private frameId: number | null = null;
  private previousTime: number | null = null;
  private destroyed = false;
  private resizeObserver: ResizeObserver;
  private resolutionQuery: MediaQueryList | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const ctx = canvas.getContext("2d");
    if (ctx === null) {
      throw new Error("Canvas 2D rendering is unavailable");
    }
    this.ctx = ctx;

    const rect = canvas.getBoundingClientRect();
    this.screenSize = { width: rect.width, height: rect.height };
    this.camera = new Camera(
      { x: 0, y: 0 },
      { x: rect.width / 2, y: rect.height / 2 },
      12,
      8,
    );

    this.resizeObserver = new ResizeObserver(([entry]) => {
      if (this.destroyed) return;

      this.screenSize = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };

      this.resizeBitmap();
    });
    this.resizeObserver.observe(canvas);

    this.watchResolution();
    this.resizeBitmap();

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerEnd);
    canvas.addEventListener("pointercancel", this.onPointerEnd);
    canvas.addEventListener("lostpointercapture", this.onPointerEnd);
    window.addEventListener("blur", this.onBlur);
  }

  private watchResolution = () => {
    this.resolutionQuery?.removeEventListener(
      "change",
      this.onResolutionChange,
    );

    this.resolutionQuery = window.matchMedia(
      `(resolution: ${window.devicePixelRatio || 1}dppx)`,
    );

    this.resolutionQuery.addEventListener("change", this.onResolutionChange);
  };

  private onResolutionChange = () => {
    if (this.destroyed) return;

    this.watchResolution();
    this.resizeBitmap();
  };

  private resizeBitmap() {
    const dpr = window.devicePixelRatio || 1;

    const width = Math.max(1, Math.round(this.screenSize.width * dpr));
    const height = Math.max(1, Math.round(this.screenSize.height * dpr));
    if (this.canvas.width !== width) {
      this.canvas.width = width;
    }

    if (this.canvas.height !== height) {
      this.canvas.height = height;
    }

    this.requestRender();
  }

  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary || this.pointerId !== null)
      return;

    this.pointerId = event.pointerId;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.canvas.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerId) return;

    if (event.pointerType === "mouse" && (event.buttons & 1) === 0) {
      this.stopDragging();

      return;
    }

    this.camera.panBy(
      {
        x: this.lastPointer.x - event.clientX,
        y: this.lastPointer.y - event.clientY,
      },
      { screenSize: this.screenSize, worldSize: this.worldSize },
    );
    this.lastPointer = { x: event.clientX, y: event.clientY };

    this.requestRender();
  };

  private onPointerEnd = (event: PointerEvent) => {
    if (event.pointerId === this.pointerId) {
      this.stopDragging();
    }
  };

  private onBlur = () => this.stopDragging();

  private stopDragging() {
    const pointerId = this.pointerId;
    this.pointerId = null;

    if (pointerId !== null && this.canvas.hasPointerCapture(pointerId)) {
      this.canvas.releasePointerCapture(pointerId);
    }
  }

  requestRender = () => {
    if (this.destroyed || this.frameId !== null) {
      return;
    }

    this.frameId = requestAnimationFrame(this.onFrame);
  };

  private onFrame = (time: number) => {
    this.frameId = null;
    if (this.destroyed) {
      return;
    }

    const deltaSeconds =
      this.previousTime === null
        ? 1 / 60
        : Math.min((time - this.previousTime) / 1000, 0.05);

    this.previousTime = time;

    const moving = this.camera.update(
      { screenSize: this.screenSize, worldSize: this.worldSize },
      deltaSeconds,
    );
    this.render();

    if (moving) {
      this.requestRender();
    } else {
      this.previousTime = null;
    }
  };

  private render() {
    const { ctx, canvas, screenSize } = this;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (screenSize.width <= 0 || screenSize.height <= 0) {
      return;
    }

    const scaleX = canvas.width / screenSize.width;
    const scaleY = canvas.height / screenSize.height;
    const zoom = this.camera.getZoom();
    const cameraPosition = this.camera.getPosition();

    ctx.save();

    ctx.setTransform(
      scaleX * zoom,
      0,
      0,
      scaleY * zoom,
      -cameraPosition.x * scaleX * zoom,
      -cameraPosition.y * scaleY * zoom,
    );

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1000, 1000);
    ctx.stroke();

    ctx.restore();
  }

  destroy() {
    this.destroyed = true;

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }
    this.frameId = null;

    this.resizeObserver.disconnect();
    this.resolutionQuery?.removeEventListener(
      "change",
      this.onResolutionChange,
    );

    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerEnd);
    this.canvas.removeEventListener("pointercancel", this.onPointerEnd);
    this.canvas.removeEventListener("lostpointercapture", this.onPointerEnd);
    window.removeEventListener("blur", this.onBlur);

    this.stopDragging();
  }
}

export default CanvasRender;
