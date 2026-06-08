import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  dismissHebrewG1BookFirstSoftGate,
  getHebrewG1LiteracyFoundationBookHref,
  getHebrewG1LiteracyFoundationPageIds,
  isHebrewG1LiteracyFoundationComplete,
  recordHebrewG1LiteracyPageView,
  shouldShowHebrewG1BookFirstSoftGate,
} from "../../lib/learning-book/hebrew-g1-literacy-progress.js";

describe("hebrew G1 literacy progress", () => {
  it("foundation pages come from book batch A", () => {
    const pages = getHebrewG1LiteracyFoundationPageIds();
    assert.ok(pages.length >= 8);
    assert.ok(pages.includes("g1.letters"));
    assert.ok(pages.includes("g1.basic_niqqud"));
  });

  it("foundation book href points to first batch A page", () => {
    const href = getHebrewG1LiteracyFoundationBookHref();
    const pages = getHebrewG1LiteracyFoundationPageIds();
    assert.equal(href, `/learning/book/hebrew/g1/${pages[0]}`);
  });

  it("soft gate shows for grammar/comprehension until foundation or dismiss", () => {
    assert.equal(
      shouldShowHebrewG1BookFirstSoftGate({ gradeKey: "g1", topic: "grammar", progressState: {} }),
      true
    );
    assert.equal(
      shouldShowHebrewG1BookFirstSoftGate({ gradeKey: "g1", topic: "reading", progressState: {} }),
      false
    );
    assert.equal(
      shouldShowHebrewG1BookFirstSoftGate({ gradeKey: "g2", topic: "grammar", progressState: {} }),
      false
    );
  });

  it("foundation completes after enough batch A pages viewed", () => {
    const pages = getHebrewG1LiteracyFoundationPageIds().slice(0, 4);
    let state = { viewedPageIds: [], dismissedTopics: [] };
    for (const pageId of pages) {
      state = recordHebrewG1LiteracyPageView(pageId, state);
    }
    assert.equal(isHebrewG1LiteracyFoundationComplete(state), true);
    assert.equal(
      shouldShowHebrewG1BookFirstSoftGate({
        gradeKey: "g1",
        topic: "comprehension",
        progressState: state,
      }),
      false
    );
  });

  it("dismiss hides soft gate without blocking other topics", () => {
    const dismissed = dismissHebrewG1BookFirstSoftGate("grammar", {});
    assert.equal(
      shouldShowHebrewG1BookFirstSoftGate({
        gradeKey: "g1",
        topic: "grammar",
        progressState: dismissed,
      }),
      false
    );
    assert.equal(
      shouldShowHebrewG1BookFirstSoftGate({
        gradeKey: "g1",
        topic: "comprehension",
        progressState: dismissed,
      }),
      true
    );
  });
});
