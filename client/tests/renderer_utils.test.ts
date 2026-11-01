import assert from "node:assert/strict";
import test from "node:test";
import {
  clientToScreen,
  screenToWorld,
  getAutoPanVelocity,
  getRandInt,
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
    { start: startObject, end: endObject },
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
    { start: startObject, end: endObject },
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
    { start: startObject, end: endObject },
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
    { start: startObject, end: endObject },
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
    { start: startObject, end: endObject },
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
    { start: startObject, end: endObject },
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

test("getRandInt returns min when Math.random returns 0", (t) => {
  t.mock.method(Math, "random", () => 0);

  assert.equal(getRandInt(3, 7), 3);
  assert.equal(getRandInt(-5, 5), -5);
});

test("getRandInt returns max when Math.random is just below 1", (t) => {
  t.mock.method(Math, "random", () => 0.9999999999);

  assert.equal(getRandInt(3, 7), 7);
  assert.equal(getRandInt(-5, 5), 5);
});

test("getRandInt maps Math.random evenly across the range", (t) => {
  const randomValues = [0, 0.2, 0.4, 0.6, 0.8];
  let call = 0;
  t.mock.method(Math, "random", () => randomValues[call++]);

  const results = randomValues.map(() => getRandInt(10, 14));

  assert.deepEqual(results, [10, 11, 12, 13, 14]);
});

test("getRandInt returns integers within [min, max] and hits both ends", () => {
  const min = -3;
  const max = 3;
  const seen = new Set<number>();

  for (let i = 0; i < 10_000; i++) {
    const value = getRandInt(min, max);

    assert.ok(Number.isInteger(value), `${value} is not an integer`);
    assert.ok(value >= min && value <= max, `${value} out of range`);
    seen.add(value);
  }

  assert.equal(seen.size, max - min + 1);
  assert.ok(seen.has(min));
  assert.ok(seen.has(max));
});

test("getRandInt returns the value when min equals max", () => {
  for (let i = 0; i < 100; i++) {
    assert.equal(getRandInt(4, 4), 4);
  }
});

test("getRandInt narrows non-integer bounds to integers inside them", (t) => {
  t.mock.method(Math, "random", () => 0);
  assert.equal(getRandInt(1.2, 3.8), 2);

  t.mock.method(Math, "random", () => 0.9999999999);
  assert.equal(getRandInt(1.2, 3.8), 3);
});

test("getRandInt throws when the range contains no integer", () => {
  assert.throws(() => getRandInt(5, 1), RangeError);
  assert.throws(() => getRandInt(1.2, 1.8), RangeError);
});

test("getRandInt throws on non-finite bounds", () => {
  assert.throws(() => getRandInt(0, Infinity), RangeError);
  assert.throws(() => getRandInt(NaN, 5), RangeError);
});
