// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { dismissInboxItem, readInbox, unreadCount, type InboxItem } from "./notifications";
import { writeStored } from "./store";

const item = (id: string, read = false): InboxItem => ({
  id,
  kind: "push",
  subject: `Notification ${id}`,
  body: `Body ${id}`,
  createdAt: "2026-07-15T00:00:00.000Z",
  status: "sent",
  read,
  tag: "post",
});

afterEach(() => localStorage.clear());

describe("notifications inbox", () => {
  it("dismisses one notification without clearing the rest", () => {
    writeStored("moodfood-inbox", [item("first"), item("second"), item("third", true)]);

    dismissInboxItem("second");

    expect(readInbox().map(i => i.id)).toEqual(["first", "third"]);
    expect(unreadCount()).toBe(1);
  });
});
