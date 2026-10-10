interface Size {
  width: number;
  height: number;
}

interface Position {
  x: number;
  y: number;
}

interface MouseEvents {
  isClicked: boolean;
  startPosition: Position;
  endPosition: Position;
}

export type { Size, Position, MouseEvents };
