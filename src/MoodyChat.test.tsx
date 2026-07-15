// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MoodyChat } from "./components/MoodyChat";
import { defaultProfile } from "./store";

const callFnMock = vi.hoisted(() => vi.fn(async () => ({ message: "Try the bean tacos." })));

vi.mock("./api/backend", () => ({
  callFn: callFnMock,
}));

describe("MoodyChat", () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
    callFnMock.mockClear();
    callFnMock.mockResolvedValue({ message: "Try the bean tacos." });
  });

  afterEach(() => {
    cleanup();
  });

  it("moves the modal when the header is dragged", () => {
    render(
      <MoodyChat
        profile={defaultProfile}
        mood="Tired"
        picks={[]}
        candidates={[]}
        openRecipe={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText("Chat with Moody"));
    const dialog = screen.getByRole("dialog", { name: "Moody chat" });
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({
      left: 252,
      top: 80,
      right: 772,
      bottom: 760,
      width: 520,
      height: 680,
      x: 252,
      y: 80,
      toJSON: () => ({}),
    });

    const header = screen.getByText("Moody").closest("header");
    expect(header).not.toBeNull();

    fireEvent.pointerDown(header!, { clientX: 100, clientY: 120, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 145, clientY: 80, pointerId: 1 });

    expect(dialog.style.transform).toBe("translate(45px, -40px)");
  });

  it("clears the current Moody conversation and restores the opener", async () => {
    render(
      <MoodyChat
        profile={defaultProfile}
        mood="Tired"
        picks={[]}
        candidates={[]}
        openRecipe={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText("Chat with Moody"));
    fireEvent.change(screen.getByLabelText("Message Moody"), { target: { value: "Need tacos" } });
    fireEvent.click(screen.getByLabelText("Send"));

    await screen.findByText("Need tacos");
    await screen.findByText("Try the bean tacos.");

    fireEvent.click(screen.getByLabelText("Clear Moody chat"));

    expect(screen.queryByText("Need tacos")).toBeNull();
    expect(screen.queryByText("Try the bean tacos.")).toBeNull();
    expect(screen.getByText(/You're feeling tired/)).toBeTruthy();
  });
});
