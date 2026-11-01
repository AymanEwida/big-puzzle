import type { Position, Size } from "../types";

interface CameraBounds {
  screenSize: Size;
  worldSize: Size;
}

interface CameraBoundaries {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface ZoomAnchor {
  screen: Position;
  world: Position;
}

export type { CameraBounds, ZoomAnchor, CameraBoundaries };
