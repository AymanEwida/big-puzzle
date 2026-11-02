import type { ObjectPositions } from "./puzzle-pieces/types.ts";
import Piece from "./puzzle-pieces/piece.ts";
import type {
  AutoPanInfo,
  CameraInfo,
  ClientBoundings,
  Position,
  Size,
} from "./types.ts";
import { pieceSize } from "./puzzle-pieces/constants.ts";

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
  { start: startObject, end: endObject }: ObjectPositions,
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

function getRandInt(min: number, max: number): number {
  const low = Math.ceil(min);
  const high = Math.floor(max);

  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    throw new RangeError("getRandInt: min and max must be finite numbers");
  }

  if (low > high) {
    throw new RangeError(`getRandInt: no integer in range [${min}, ${max}]`);
  }

  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function getRandomPieces(
  numberOfPieces: number,
  worldSize: Size,
): Array<Piece> {
  return Array.from(
    { length: numberOfPieces },
    (_, idx: number) =>
      new Piece(idx, {
        x: getRandInt(pieceSize / 2, worldSize.width - pieceSize / 2),
        y: getRandInt(pieceSize / 2, worldSize.height - pieceSize / 2),
      }),
  );
}

export {
  clientToScreen,
  screenToWorld,
  getAxisAutoPanSpeed,
  getAutoPanVelocity,
  getRandInt,
  getRandomPieces,
};
