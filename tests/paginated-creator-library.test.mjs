import assert from "node:assert/strict";
import test from "node:test";
import { createPaginatedCreatorLibrary } from "../shared/paginatedCreatorLibrary.js";

test("creator libraries load incrementally and stop after the final page", async () => {
  const calls = [];
  const pages = [
    { entries: [{ id: "a" }, { id: "b" }], cursor: "page-1", hasMore: true },
    { entries: [{ id: "b" }, { id: "c" }], cursor: "page-2", hasMore: false }
  ];
  const library = createPaginatedCreatorLibrary({
    pageSize: 2,
    persistence: {
      async listPage(options) {
        calls.push(options);
        return pages[calls.length - 1];
      }
    }
  });

  assert.deepEqual((await library.refresh()).records.map(({ id }) => id), ["a", "b"]);
  assert.deepEqual((await library.loadMore()).records.map(({ id }) => id), ["a", "b", "c"]);
  await library.loadMore();
  assert.equal(calls.length, 2);
  assert.deepEqual(calls, [
    { cursor: null, pageSize: 2 },
    { cursor: "page-1", pageSize: 2 }
  ]);
});

test("refresh failures retain acknowledged and previously loaded records", async () => {
  let fail = false;
  const library = createPaginatedCreatorLibrary({
    persistence: {
      async listPage() {
        if (fail) throw new Error("offline");
        return { entries: [{ id: "saved", name: "Server copy" }], cursor: null, hasMore: false };
      }
    }
  });

  await library.refresh();
  library.retain({ id: "new", name: "Acknowledged locally" });
  fail = true;
  await assert.rejects(library.refresh(), /offline/);
  assert.deepEqual(library.getState().records.map(({ id }) => id), ["new", "saved"]);
  assert.match(library.getState().error.message, /offline/);
});
