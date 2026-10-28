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

interface ClientBoundings {
  left: number;
  top: number;
  size: Size;
}

interface CameraInfo {
  position: Position;
  zoom: number;
}

interface AutoPanInfo {
  autoPanRampDistance: number;
  autoPanMinSpeed: number;
  autoPanMaxSpeed: number;
}

interface ObjectInfo {
  startObject: Position;
  endObject: Position;
}

export type {
  Size,
  Position,
  MouseEvents,
  ClientBoundings,
  CameraInfo,
  AutoPanInfo,
  ObjectInfo,
};
