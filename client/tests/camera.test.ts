import assert from "node:assert/strict";
import test from "node:test";
import Camera from "../src/puzzle_game/camera.ts";

const bounds = {
  screenSize: { width: 1000, height: 600 },
  worldSize: { width: 10000, height: 10000 },
};
const makeCamera = () => new Camera({ x: 0, y: 0 }, { x: 500, y: 300 }, 12, 18);

test("a fixed target converges without alternating or overshooting, then stops", () => {
  const camera = makeCamera();
  camera.setCenter({ x: 600, y: 350 });

  let previousX = 0;
  let moving = true;
  for (let frame = 0; frame < 120; frame++) {
    moving = camera.update(bounds, 1 / 60);

    assert.ok(camera.getPosition().x >= previousX);
    assert.ok(camera.getPosition().x <= 100);

    previousX = camera.getPosition().x;
  }

  assert.deepEqual(camera.getPosition(), { x: 100, y: 50 });
  assert.equal(moving, false);

  camera.update(bounds, 1 / 60);
  assert.deepEqual(camera.getPosition(), { x: 100, y: 50 });
});

test("equal elapsed time gives equal smoothing at 30, 60, and 144 Hz", () => {
  const positions = [30, 60, 144].map((fps) => {
    const camera = makeCamera();
    camera.setCenter({ x: 1500, y: 300 });

    for (let frame = 0; frame < fps / 2; frame++) {
      camera.update(bounds, 1 / fps);
    }

    return camera.getPosition().x;
  });

  for (const position of positions) {
    assert.ok(Math.abs(position - positions[0]) < 1e-8);
  }
});

test("dragging beyond either world edge does not accumulate hidden movement", () => {
  const camera = makeCamera();
  camera.panBy({ x: -5000, y: -5000 }, bounds);
  camera.panBy({ x: 10, y: 10 }, bounds);
  assert.deepEqual(camera.getCenter(), { x: 510, y: 310 });

  camera.panBy({ x: 20000, y: 20000 }, bounds);
  camera.panBy({ x: -10, y: -10 }, bounds);
  assert.deepEqual(camera.getCenter(), { x: 9490, y: 9690 });
});

test("a world smaller than the viewport stays at the origin and settles", () => {
  const camera = makeCamera();
  camera.setCenter({ x: 9000, y: 9000 });

  const moving = camera.update(
    { ...bounds, worldSize: { width: 100, height: 100 } },
    1 / 60,
  );
  assert.deepEqual(camera.getPosition(), { x: 0, y: 0 });
  assert.equal(moving, false);
});

test("growing the viewport at the world edge clamps both target and position", () => {
  const camera = makeCamera();
  camera.setCenter({ x: 9500, y: 9700 });

  for (let frame = 0; frame < 120; frame++) {
    camera.update(bounds, 1 / 60);
  }

  const resizedBounds = {
    ...bounds,
    screenSize: { width: 2000, height: 1200 },
  };
  camera.update(resizedBounds, 1 / 60);

  assert.deepEqual(camera.getPosition(), { x: 8000, y: 8800 });
});

test("zoom out on edge clamps the camera position", () => {
  const camera = makeCamera();
  camera._setTargetZoom(0.5);
  camera._setZoomAnchor({
    x: bounds.screenSize.width / 2,
    y: bounds.screenSize.height / 2,
  });

  let moving = true;

  for (let frame = 0; frame < 120; frame++) {
    moving = camera.update(bounds, 1 / 60);
  }

  assert.deepEqual(camera.getPosition(), { x: 0, y: 0 });
  assert.equal(moving, false);

  camera._setZoomAnchor(null);
  camera.setCenter({ x: 9600, y: 9800 });

  moving = true;

  for (let frame = 0; frame < 120; frame++) {
    moving = camera.update(bounds, 1 / 60);
  }

  assert.deepEqual(camera.getPosition(), { x: 8000, y: 8800 });
  assert.deepEqual(camera.getCenter(), { x: 9000, y: 9400 });
  assert.equal(moving, false);

  camera._setZoomAnchor({
    x: bounds.screenSize.width / 2,
    y: bounds.screenSize.height / 2,
  });

  moving = camera.update(bounds, 1 / 60);

  assert.deepEqual(camera.getPosition(), { x: 8000, y: 8800 });
  assert.deepEqual(camera.getCenter(), { x: 9000, y: 9400 });
  assert.equal(moving, false);
});

test("zoom till target without overshooting and then stops", () => {
  const camera = makeCamera();

  let targetZoom = 0.6;
  camera._setTargetZoom(targetZoom);
  camera._setZoomAnchor({
    x: bounds.screenSize.width / 2,
    y: bounds.screenSize.height / 2,
  });

  let moving = true;
  let previousZoom = camera.getZoom();

  for (let frame = 0; frame < 120; frame++) {
    moving = camera.update(bounds, 1 / 60);

    assert.equal(camera.getZoom() <= previousZoom, true);
    assert.equal(targetZoom <= previousZoom, true);

    previousZoom = camera.getZoom();
  }

  assert.equal(moving, false);
  assert.equal(camera.getZoom(), targetZoom);
  assert.equal(camera.getZoomAnchor(), null);

  targetZoom = 2.3;
  camera._setTargetZoom(targetZoom);
  camera._setZoomAnchor({
    x: bounds.screenSize.width / 2,
    y: bounds.screenSize.height / 2,
  });

  moving = true;
  previousZoom = camera.getZoom();

  for (let frame = 0; frame < 120; frame++) {
    moving = camera.update(bounds, 1 / 60);

    assert.equal(previousZoom <= camera.getZoom(), true);
    assert.equal(previousZoom <= targetZoom, true);

    previousZoom = camera.getZoom();
  }

  assert.equal(moving, false);
  assert.equal(camera.getZoom(), targetZoom);
  assert.equal(camera.getZoomAnchor(), null);
});

test("zoom till target with diffrenet refresh rate achives smoothness", () => {
  const zooms = [30, 60, 144].map((fps) => {
    const camera = makeCamera();
    camera._setTargetZoom(0.5);
    camera._setZoomAnchor({
      x: bounds.screenSize.width / 2,
      y: bounds.screenSize.height / 2,
    });

    for (let frame = 0; frame < fps / 2; frame++) {
      camera.update(bounds, 1 / fps);
    }

    return camera.getZoom();
  });

  for (const zoom of zooms) {
    assert.ok(Math.abs(zoom - zooms[0]) < 1e-8);
  }
});
