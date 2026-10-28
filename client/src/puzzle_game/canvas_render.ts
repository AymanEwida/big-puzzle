import type { AutoPanInfo, Position, Size } from "./types";
import Camera from "./camera/camera";
import { clientToScreen, getAutoPanVelocity, screenToWorld } from "./utils";

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
  private frameId: number | null = null;
  private previousTime: number | null = null;
  private destroyed = false;
  private resizeObserver: ResizeObserver;
  private resolutionQuery: MediaQueryList | null = null;
  private dragOffset: Position | null = null;
  // TODO: see if autoPanRampDistance should be determined by object size and have distance to x and one for y
  private readonly autoPanInfo: AutoPanInfo = {
    autoPanRampDistance: 120,
    autoPanMinSpeed: 400,
    autoPanMaxSpeed: 600,
  };

  // this object for test only, will change later
  private readonly objectSize: Size = {
    width: 200,
    height: 200,
  };
  private startObject: Position = { x: 5000, y: 5000 };
  private endObject: Position = {
    x: this.startObject.x + this.objectSize.width,
    y: this.startObject.y + this.objectSize.height,
  };

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

  private updateDraggedObject(screenPointer: Position) {
    if (this.dragOffset === null) {
      return;
    }

    const cameraPosition = this.camera.getPosition();
    const cameraZoom = this.camera.getZoom();
    const worldPointer = screenToWorld(screenPointer, {
      zoom: cameraZoom,
      position: cameraPosition,
    });
    if (worldPointer === null) {
      return;
    }

    const maxX = Math.max(0, this.worldSize.width - this.objectSize.width);
    const maxY = Math.max(0, this.worldSize.height - this.objectSize.height);

    this.startObject = {
      x: Math.max(0, Math.min(worldPointer.x - this.dragOffset.x, maxX)),
      y: Math.max(0, Math.min(worldPointer.y - this.dragOffset.y, maxY)),
    };

    this.endObject = {
      x: this.startObject.x + this.objectSize.width,
      y: this.startObject.y + this.objectSize.height,
    };
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
      this.pointerId !== null ||
      (event.button !== LEFT_CLICK_BUTTON &&
        event.button !== RIGHT_CLICK_BUTTON)
    ) {
      return;
    }

    const clientPointer = {
      x: event.clientX,
      y: event.clientY,
    };

    const rect = this.canvas.getBoundingClientRect();
    const screenPointer = clientToScreen(clientPointer, this.screenSize, {
      top: rect.top,
      left: rect.left,
      size: {
        width: rect.width,
        height: rect.height,
      },
    });

    if (screenPointer === null) {
      return;
    }

    if (event.button === LEFT_CLICK_BUTTON) {
      const cameraPosition = this.camera.getPosition();
      const cameraZoom = this.camera.getZoom();
      const worldPointer = screenToWorld(screenPointer, {
        zoom: cameraZoom,
        position: cameraPosition,
      });

      const isInsideObject =
        this.startObject.x <= worldPointer.x &&
        this.startObject.y <= worldPointer.y &&
        this.endObject.x >= worldPointer.x &&
        this.endObject.y >= worldPointer.y;

      if (!isInsideObject) {
        return;
      }

      this.dragOffset = {
        x: worldPointer.x - this.startObject.x,
        y: worldPointer.y - this.startObject.y,
      };
    } else {
      this.dragOffset = null;
    }

    this.mouseButton = event.button;
    this.pointerId = event.pointerId;
    this.lastPointer = clientPointer;

    this.canvas.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerId || this.mouseButton === null) {
      return;
    }

    const requiredButton = this.mouseButton === LEFT_CLICK_BUTTON ? 1 : 2;
    if (
      event.pointerType === "mouse" &&
      (event.buttons & requiredButton) === 0
    ) {
      this.stopDragging();

      return;
    }

    const currentClient: Position = {
      x: event.clientX,
      y: event.clientY,
    };

    if (this.mouseButton === RIGHT_CLICK_BUTTON) {
      const rect = this.canvas.getBoundingClientRect();

      const previous = clientToScreen(this.lastPointer, this.screenSize, {
        top: rect.top,
        left: rect.left,
        size: {
          width: rect.width,
          height: rect.height,
        },
      });
      const current = clientToScreen(currentClient, this.screenSize, {
        top: rect.top,
        left: rect.left,
        size: {
          width: rect.width,
          height: rect.height,
        },
      });

      if (previous !== null && current !== null) {
        this.camera.panBy(
          {
            x: previous.x - current.x,
            y: previous.y - current.y,
          },
          {
            screenSize: this.screenSize,
            worldSize: this.worldSize,
          },
        );
      }
    }

    this.lastPointer = currentClient;

    this.requestRender();
  };

  private onPointerEnd = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerId) {
      return;
    }

    if (event.type === "pointerup" && this.dragOffset !== null) {
      this.lastPointer = {
        x: event.clientX,
        y: event.clientY,
      };

      const rect = this.canvas.getBoundingClientRect();
      const screenPointer = clientToScreen(this.lastPointer, this.screenSize, {
        top: rect.top,
        left: rect.left,
        size: {
          width: rect.width,
          height: rect.height,
        },
      });

      if (screenPointer !== null) {
        this.updateDraggedObject(screenPointer);
      }

      this.requestRender();
    }

    this.stopDragging();
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
      deltaX *= this.screenSize.width;
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

    this.mouseButton = null;
    this.dragOffset = null;

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

    const bounds = { screenSize: this.screenSize, worldSize: this.worldSize };

    const isDraggingObject =
      this.pointerId !== null &&
      this.mouseButton === LEFT_CLICK_BUTTON &&
      this.dragOffset !== null;

    const rect = this.canvas.getBoundingClientRect();
    const screenPointer = isDraggingObject
      ? clientToScreen(this.lastPointer, this.screenSize, {
          top: rect.top,
          left: rect.left,
          size: {
            width: rect.width,
            height: rect.height,
          },
        })
      : null;

    let autoPanVelocity: Position = { x: 0, y: 0 };

    if (screenPointer !== null) {
      this.updateDraggedObject(screenPointer);

      const cameraPosition = this.camera.getPosition();
      const cameraZoom = this.camera.getZoom();
      autoPanVelocity = getAutoPanVelocity(
        {
          startObject: this.startObject,
          endObject: this.endObject,
        },
        this.screenSize,
        { zoom: cameraZoom, position: cameraPosition },
        this.autoPanInfo,
      );

      if (autoPanVelocity.x !== 0 || autoPanVelocity.y !== 0) {
        this.camera.panBy(
          {
            x: autoPanVelocity.x * deltaSeconds,
            y: autoPanVelocity.y * deltaSeconds,
          },
          bounds,
        );
      }
    }

    const cameraPreviousPosition = { ...this.camera.getPosition() };
    const cameraMoving = this.camera.update(bounds, deltaSeconds);
    const cameraCurrentPosition = this.camera.getPosition();

    const isCameraMoved =
      cameraPreviousPosition.x !== cameraCurrentPosition.x ||
      cameraPreviousPosition.y !== cameraCurrentPosition.y;

    if (screenPointer !== null) {
      this.updateDraggedObject(screenPointer);
    }

    this.render();

    const autoPanRequested = autoPanVelocity.x !== 0 || autoPanVelocity.y !== 0;

    if (cameraMoving || (autoPanRequested && isCameraMoved)) {
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
    ctx.fillRect(
      this.startObject.x,
      this.startObject.y,
      this.objectSize.width,
      this.objectSize.height,
    );

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
