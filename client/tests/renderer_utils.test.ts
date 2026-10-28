import assert from "node:assert/strict";
import test from "node:test";
import {
  clientToScreen,
  screenToWorld,
  getAutoPanVelocity,
} from "../src/puzzle_game/utils.ts";

test("client position to screen position without scaling", () => {
  const clientPosition = {
    x: 300,
    y: 400,
  };

  const screenSize = {
    width: 600,
    height: 800,
  };

  const clientBounding = {
    left: 0,
    top: 0,
    size: {
      width: 600,
      height: 800,
    },
  };

  const screenPosition = clientToScreen(
    clientPosition,
    screenSize,
    clientBounding,
  );

  assert.deepEqual(screenPosition, clientPosition);
});

test("client position to screen position with scale in", () => {
  const clientPosition = {
    x: 300,
    y: 400,
  };

  const screenSize = {
    width: 300,
    height: 400,
  };

  const clientBounding = {
    left: 0,
    top: 0,
    size: {
      width: 600,
      height: 800,
    },
  };

  const screenPosition = clientToScreen(
    clientPosition,
    screenSize,
    clientBounding,
  );

  assert.deepEqual(screenPosition, { x: 150.0, y: 200.0 });
});

test("client position to screen position with scale out", () => {
  const clientPosition = {
    x: 300,
    y: 400,
  };

  const screenSize = {
    width: 1200,
    height: 1600,
  };

  const clientBounding = {
    left: 0,
    top: 0,
    size: {
      width: 600,
      height: 800,
    },
  };

  const screenPosition = clientToScreen(
    clientPosition,
    screenSize,
    clientBounding,
  );

  assert.deepEqual(screenPosition, { x: 600.0, y: 800.0 });
});

test("screen position to world position without zoom", () => {
  const screenPosition = {
    x: 300,
    y: 400,
  };

  const worldPosition = screenToWorld(screenPosition, {
    position: { x: 1000, y: 1000 },
    zoom: 1,
  });

  assert.deepEqual(worldPosition, { x: 1300, y: 1400 });
});

test("screen position to world position with zoom in", () => {
  const screenPosition = {
    x: 300,
    y: 400,
  };

  const worldPosition = screenToWorld(screenPosition, {
    position: { x: 1000, y: 1000 },
    zoom: 2,
  });

  assert.deepEqual(worldPosition, { x: 1150, y: 1200 });
});

test("screen position to world position with zoom out", () => {
  const screenPosition = {
    x: 300,
    y: 400,
  };

  const worldPosition = screenToWorld(screenPosition, {
    position: { x: 1000, y: 1000 },
    zoom: 0.5,
  });

  assert.deepEqual(worldPosition, { x: 1600, y: 1800 });
});

test("object bigger that screen size returns 0 speed axis", () => {
  const screenSize = { width: 60, height: 80 };

  const startObject = { x: -10, y: -10 };
  const endObject = { x: 70, y: 50 };

  const xVelocity = getAutoPanVelocity(
    { startObject, endObject },
    screenSize,
    {
      position: { x: 0, y: 0 },
      zoom: 1,
    },
    {
      autoPanRampDistance: 120,
      autoPanMinSpeed: 150,
      autoPanMaxSpeed: 600,
    },
  ).x;

  assert.equal(xVelocity, 0);

  endObject.y = 90;

  const yVelocity = getAutoPanVelocity(
    { startObject, endObject },
    screenSize,
    {
      position: { x: 0, y: 0 },
      zoom: 1,
    },
    {
      autoPanRampDistance: 120,
      autoPanMinSpeed: 150,
      autoPanMaxSpeed: 600,
    },
  ).y;

  assert.equal(yVelocity, 0);
});

test("test velocity sing in corners", () => {
  const screenSize = { width: 60, height: 80 };

  const startObject = { x: -10, y: -10 };
  const endObject = { x: 50, y: 50 };

  let velocity = getAutoPanVelocity(
    { startObject, endObject },
    screenSize,
    {
      position: { x: 0, y: 0 },
      zoom: 1,
    },
    {
      autoPanRampDistance: 120,
      autoPanMinSpeed: 150,
      autoPanMaxSpeed: 600,
    },
  );

  assert.ok(velocity.x < 0);
  assert.ok(velocity.y < 0);

  startObject.x = 0;
  endObject.x = 70;

  velocity = getAutoPanVelocity(
    { startObject, endObject },
    screenSize,
    {
      position: { x: 0, y: 0 },
      zoom: 1,
    },
    {
      autoPanRampDistance: 120,
      autoPanMinSpeed: 150,
      autoPanMaxSpeed: 600,
    },
  );

  assert.ok(velocity.x > 0);
  assert.ok(velocity.y < 0);

  endObject.x = 70;
  startObject.y = 0;
  endObject.y = 90;

  velocity = getAutoPanVelocity(
    { startObject, endObject },
    screenSize,
    {
      position: { x: 0, y: 0 },
      zoom: 1,
    },
    {
      autoPanRampDistance: 120,
      autoPanMinSpeed: 150,
      autoPanMaxSpeed: 600,
    },
  );

  assert.ok(velocity.x > 0);
  assert.ok(velocity.y > 0);

  endObject.x = 50;
  startObject.x = -10;
  startObject.y = 90;

  velocity = getAutoPanVelocity(
    { startObject, endObject },
    screenSize,
    {
      position: { x: 0, y: 0 },
      zoom: 1,
    },
    {
      autoPanRampDistance: 120,
      autoPanMinSpeed: 150,
      autoPanMaxSpeed: 600,
    },
  );

  assert.ok(velocity.x < 0);
  assert.ok(velocity.y > 0);
});
