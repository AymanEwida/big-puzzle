import type { Position, Size } from "./types";
import Camera from "./camera/camera";

const LEFT_CLICK_BUTTON = 0;
const RIGHT_CLICK_BUTTON = 2;

class CanvasRender {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private screenSize: Size; // CSS pixels not bitmap resolution.
  private worldSize: Size = { width: 10000, height: 10000 };
  private camera: Camera;
  private pointerId: number | null = null;
  private lastPointer: Position = { x: 0, y: 0 };
  private mouseButton: number | null = null;
  private lastDeltaVector: Position | null = null;
  private frameId: number | null = null;
  private previousTime: number | null = null;
  private destroyed = false;
  private resizeObserver: ResizeObserver;
  private resolutionQuery: MediaQueryList | null = null;

  // this object for test only, will change later
  private isCurrentObjectOutOfScreen: boolean = false;
  private startObject: Position = { x: 5000, y: 5000 };
  private endObject: Position = { x: 5200, y: 5200 };

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
      10,
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
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("contextmenu", this.onContextMenu);
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
    if (this.destroyed) {
      return;
    }

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

    this.render();

    this.requestRender();
  }

  private onPointerDown = (event: PointerEvent) => {
    if (
      this.mouseButton !== null ||
      !event.isPrimary ||
      this.pointerId !== null
    ) {
      return;
    }

    this.mouseButton = event.button;
    if (this.mouseButton === null) {
      return;
    }

    if (this.mouseButton === LEFT_CLICK_BUTTON) {
      const cameraPosition = this.camera.getPosition();
      const cameraZoom = this.camera.getZoom();

      const cursorPosition = {
        x: cameraPosition.x + event.clientX / cameraZoom,
        y: cameraPosition.y + event.clientY / cameraZoom,
      };

      if (!(
        this.startObject.x <= cursorPosition.x &&
        cursorPosition.x <= this.endObject.x &&
        this.startObject.y <= cursorPosition.y &&
        cursorPosition.y <= this.endObject.y
      )) {
        this.mouseButton = null;

        return;
      }
    }

    this.pointerId = event.pointerId;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.canvas.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerId || this.mouseButton === null) {
      return;
    }

    const delta: Position = {
      x: this.lastPointer.x - event.clientX,
      y: this.lastPointer.y - event.clientY,
    };

    if (this.mouseButton === RIGHT_CLICK_BUTTON) {
      if (event.pointerType === "mouse" && (event.buttons & 2) === 0) {
        this.stopDragging();

        return;
      }

      this.camera.panBy(delta, {
        screenSize: this.screenSize,
        worldSize: this.worldSize,
      });
    } else if (this.mouseButton === LEFT_CLICK_BUTTON) {
      const cameraZoom = this.camera.getZoom();

      this.startObject = {
        x: Math.max(0, this.startObject.x - delta.x / cameraZoom),
        y: Math.max(0, this.startObject.y - delta.y / cameraZoom),
      };

      this.endObject = {
        x: Math.min(this.startObject.x + 200, this.worldSize.width),
        y: Math.min(this.startObject.y + 200, this.worldSize.height),
      };

      const cameraStartPosition = this.camera.getPosition();
      const cameraEndPosition = {
        x: cameraStartPosition.x + this.screenSize.width,
        y: cameraStartPosition.y + this.screenSize.height,
      };

      this.isCurrentObjectOutOfScreen =
        this.startObject.x <= cameraStartPosition.x ||
        this.endObject.x >= cameraEndPosition.x ||
        this.startObject.y <= cameraStartPosition.y ||
        this.endObject.y >= cameraEndPosition.y;
    }

    this.lastDeltaVector = delta;
    this.lastPointer = { x: event.clientX, y: event.clientY };

    this.requestRender();
  };

  private onPointerEnd = (event: PointerEvent) => {
    this.lastDeltaVector = null;
    this.isCurrentObjectOutOfScreen = false;
    this.mouseButton = null;

    if (event.pointerId === this.pointerId) {
      this.stopDragging();
    }
  };

  private onBlur = () => this.stopDragging();

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();

    let deltaY = event.deltaY;
    let deltaX = event.deltaX;

    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      deltaY *= 16;
      deltaX *= 16;
    } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      deltaY *= this.screenSize.height;
      deltaX *= this.screenSize.height;
    }

    if (!event.ctrlKey) {
      if (deltaX === 0 && deltaY === 0) {
        return;
      }

      this.camera.panBy(
        {
          x: deltaX,
          y: deltaY,
        },
        { screenSize: this.screenSize, worldSize: this.worldSize },
      );

      this.requestRender();
    } else {
      const rect = this.canvas.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      if (deltaY === 0) {
        return;
      }

      const anchor = {
        x: (event.clientX - rect.left) * (this.screenSize.width / rect.width),
        y: (event.clientY - rect.top) * (this.screenSize.height / rect.height),
      };

      this.camera.pinchBy(deltaY, anchor, this.screenSize);

      this.requestRender();
    }
  };

  private onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

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

    let moving = this.camera.update(
      { screenSize: this.screenSize, worldSize: this.worldSize },
      deltaSeconds,
    );
    this.render();

    // TODO: fix this the object is moving too slow
    if (this.isCurrentObjectOutOfScreen && this.lastDeltaVector !== null) {
      console.log("lastDelta", this.lastDeltaVector);

      this.camera.panBy(
        {
          x: -this.lastDeltaVector.x,
          y: -this.lastDeltaVector.y,
        },
        {
          screenSize: this.screenSize,
          worldSize: this.worldSize,
        },
      );

      const cameraZoom = this.camera.getZoom();

      this.startObject = {
        x: Math.max(
          0,
          this.startObject.x - this.lastDeltaVector.x / cameraZoom,
        ),
        y: Math.max(
          0,
          this.startObject.y - this.lastDeltaVector.y / cameraZoom,
        ),
      };

      this.endObject = {
        x: Math.min(this.startObject.x + 200, this.worldSize.width),
        y: Math.min(this.startObject.y + 200, this.worldSize.height),
      };

      moving = true;
    }

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

    ctx.fillStyle = "red";
    ctx.fillRect(500, 500, 200, 200);
    ctx.fillRect(this.startObject.x, this.startObject.y, 200, 200);

    ctx.restore();

    const cameraCenter = this.camera.getCenter();

    ctx.font = "48px serif";

    ctx.fillText(
      `center: (x: ${Math.round(cameraCenter.x)}, y: ${Math.round(cameraCenter.y)})`,
      10,
      this.canvas.height - 100,
    );

    ctx.fillText(
      `top left: (x: ${Math.round(cameraPosition.x)}, y: ${Math.round(cameraPosition.y)})`,
      10,
      this.canvas.height - 30,
    );
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
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
    window.removeEventListener("blur", this.onBlur);

    this.stopDragging();
  }
}

export default CanvasRender;
