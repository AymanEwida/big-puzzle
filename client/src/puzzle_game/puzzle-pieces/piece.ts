import type { Position, Size } from "../types.ts";
import {
  atlasImageCols,
  cellSize,
  pieceMargin,
  pieceSize,
} from "./constants.ts";

class Piece {
  private id: number;
  private center: Position;
  private groupId: number;

  constructor(id: number, center: Position) {
    this.id = id;
    this.groupId = id;
    this.center = center;
  }

  getId(): number {
    return this.id;
  }

  getLeftTopPosition(): Position {
    return {
      x: this.center.x - pieceSize / 2,
      y: this.center.y - pieceSize / 2,
    };
  }

  getCenter() {
    return this.center;
  }

  setCenter(newCenter: Position) {
    this.center = newCenter;
  }

  getGroupId() {
    return this.groupId;
  }

  getDrawPieceInfo(): {
    cell: { position: Position; size: Size };
    world: { position: Position; size: Size };
  } {
    const left = this.center.x - pieceSize / 2;
    const top = this.center.y - pieceSize / 2;

    const sx = (this.id % atlasImageCols) * cellSize;
    const sy = Math.floor(this.id / atlasImageCols) * cellSize;

    return {
      cell: {
        position: {
          x: sx,
          y: sy,
        },
        size: { width: cellSize, height: cellSize },
      },
      world: {
        position: { x: left - pieceMargin, y: top - pieceMargin },
        size: { width: cellSize, height: cellSize },
      },
    };
  }
}

export default Piece;
