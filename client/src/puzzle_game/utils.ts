import type {
  AutoPanInfo,
  CameraInfo,
  ClientBoundings,
  ObjectInfo,
  Position,
  Size,
} from "./types.ts";

function clientToScreen(
  clientPosition: Position,
  screenSize: Size,
  clientBounding: ClientBoundings,
): Position | null {
  if (clientBounding.size.width <= 0 || clientBounding.size.height <= 0) {
    return null;
  }

  return {
    x:
      (clientPosition.x - clientBounding.left) *
      (screenSize.width / clientBounding.size.width),
    y:
      (clientPosition.y - clientBounding.top) *
      (screenSize.height / clientBounding.size.height),
  };
}

function screenToWorld(
  screenPosition: Position,
  { position: cameraPosition, zoom }: CameraInfo,
): Position {
  return {
    x: cameraPosition.x + screenPosition.x / zoom,
    y: cameraPosition.y + screenPosition.y / zoom,
  };
}

function getAxisAutoPanSpeed(
  startAxis: number,
  endAxis: number,
  viewportSize: number,
  { autoPanRampDistance, autoPanMinSpeed, autoPanMaxSpeed }: AutoPanInfo,
): number {
  if (startAxis < 0 && endAxis > viewportSize) {
    return 0;
  }
  let overflow = 0;

  if (startAxis < 0) {
    overflow = startAxis;
  } else if (endAxis > viewportSize) {
    overflow = endAxis - viewportSize;
  }

  if (overflow === 0) {
    return 0;
  }

  const overflowPercentage = Math.min(
    Math.abs(overflow) / autoPanRampDistance,
    1,
  );

  const speed =
    autoPanMinSpeed + (autoPanMaxSpeed - autoPanMinSpeed) * overflowPercentage;

  return Math.sign(overflow) * speed;
}

function getAutoPanVelocity(
  { startObject, endObject }: ObjectInfo,
  screenSize: Size,
  { position: cameraPosition, zoom }: CameraInfo,
  autoPanInfo: AutoPanInfo,
): Position {
  const screenPositions = {
    left: (startObject.x - cameraPosition.x) * zoom,
    top: (startObject.y - cameraPosition.y) * zoom,
    right: (endObject.x - cameraPosition.x) * zoom,
    bottom: (endObject.y - cameraPosition.y) * zoom,
  };

  return {
    x: getAxisAutoPanSpeed(
      screenPositions.left,
      screenPositions.right,
      screenSize.width,
      autoPanInfo,
    ),
    y: getAxisAutoPanSpeed(
      screenPositions.top,
      screenPositions.bottom,
      screenSize.height,
      autoPanInfo,
    ),
  };
}

export {
  clientToScreen,
  screenToWorld,
  getAxisAutoPanSpeed,
  getAutoPanVelocity,
};
