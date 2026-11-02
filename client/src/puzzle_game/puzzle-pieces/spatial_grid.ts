import type { CameraBoundaries } from "../camera/types";
import type { Position } from "../types";
import { chunkSize, maxPiecePad, piecesNumber } from "./constants";
import type Piece from "./piece";

class SpatialGrid {
  private pieces = new Array<Piece>(piecesNumber);

  private rows: number;
  private cols: number;
  private chunksGrid: Set<number>[];

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;

    this.chunksGrid = Array.from(
      { length: rows * cols },
      () => new Set<number>(),
    );
  }

  getPiece(id: number): Piece {
    return this.pieces[id];
  }

  getPiecesInChunk(checkIdx: number): Set<number> {
    return this.chunksGrid[checkIdx];
  }

  key(position: Position) {
    return (
      Math.floor(position.y / chunkSize) * this.cols +
      Math.floor(position.x / chunkSize)
    );
  }

  initializePieces(pieces: Array<Piece>) {
    this.pieces = pieces;

    for (const piece of pieces) {
      const pieceId = piece.getId();
      const key = this.key(piece.getCenter());

      this.chunksGrid[key].add(pieceId);
    }
  }

  move(pieceId: number, oldPosition: Position, newPosition: Position) {
    const oldKey = this.key(oldPosition);
    const newKey = this.key(newPosition);

    if (oldKey !== newKey) {
      this.chunksGrid[oldKey].delete(pieceId);
      this.chunksGrid[newKey].add(pieceId);
    }
  }

  getScreenCut({ left, top, right, bottom }: CameraBoundaries): number[] {
    const startCol = Math.max(0, Math.floor((left - maxPiecePad) / chunkSize));
    const endCol = Math.min(
      this.cols - 1,
      Math.floor((right + maxPiecePad) / chunkSize),
    );

    const startRow = Math.max(0, Math.floor((top - maxPiecePad) / chunkSize));
    const endRow = Math.min(
      this.rows - 1,
      Math.floor((bottom + maxPiecePad) / chunkSize),
    );

    const piecesIds: number[] = [];

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const idx = row * this.cols + col;

        for (const pieceId of this.chunksGrid[idx]) {
          const piece = this.pieces[pieceId];
          const pieceCenter = piece.getCenter();

          if (
            pieceCenter.x + maxPiecePad < left ||
            pieceCenter.x - maxPiecePad > right ||
            pieceCenter.y + maxPiecePad < top ||
            pieceCenter.y - maxPiecePad > bottom
          ) {
            continue;
          }

          piecesIds.push(pieceId);
        }
      }
    }

    return piecesIds;
  }
}

export default SpatialGrid;
