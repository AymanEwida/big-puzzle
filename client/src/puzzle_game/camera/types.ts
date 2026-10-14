import type { Position, Size } from "../types";

interface CameraBounds {
  screenSize: Size;
  worldSize: Size;
}

interface ZoomAnchor {
  screen: Position;
  world: Position;
}

export type { CameraBounds, ZoomAnchor };
