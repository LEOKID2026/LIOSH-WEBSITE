import assert from "node:assert/strict";
import { sanitizeActivityTitleHe } from "../../lib/platform-ui/hebrew-display-labels.js";

assert.equal(sanitizeActivityTitleHe("יום 11 שעה 2 — geometry", "geometry"), "יום 11 שעה 2 — גאומטריה");
assert.equal(sanitizeActivityTitleHe("geometry — quiz", "geometry"), "גאומטריה · בוחן");
assert.ok(!sanitizeActivityTitleHe("moledet_geography review", "moledet_geography").includes("moledet"));
assert.ok(sanitizeActivityTitleHe("guided_practice", "math").includes("תרגול"));

console.log("hebrew-activity-title-unit: ok");
