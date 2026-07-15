// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NotificationsPanel } from "./NotificationsPanel";
import { readInbox, type InboxItem } from "../notifications";
import { defaultProfile, writeStored } from "../store";

const item = (id: string, subject: string): InboxItem => ({
  id,
  kind: "push",
  subject,
  body: `Body for ${subject}`,
  createdAt: "2026-07-15T00:00:00.000Z",
  status: "sent",
  read: false,
  tag: "post",
});

beforeAll(() => {
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || (() => {});
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("NotificationsPanel", () => {
  it("renders readable notifications and only reveals delete while dragging", () => {
    writeStored("moodfood-inbox", [item("first", "First notice"), item("second", "Second notice")]);
    render(<NotificationsPanel close={vi.fn()} profile={defaultProfile} save={vi.fn()} refresh={vi.fn()} />);

    expect(screen.getByText("First notice")).toBeTruthy();
    expect(screen.getByText("Second notice")).toBeTruthy();
    expect(screen.queryByText("Delete")).toBeNull();

    const row = screen.getByText("First notice").closest(".notif-card");
    expect(row).toBeTruthy();
    fireEvent.pointerDown(row!, { pointerId: 1, clientX: 220 });
    fireEvent.pointerMove(row!, { pointerId: 1, clientX: 80 });
    expect(screen.getByText("Delete")).toBeTruthy();
    fireEvent.pointerUp(row!, { pointerId: 1, clientX: 80 });

    expect(readInbox().map(i => i.id)).toEqual(["second"]);
  });
});
