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
