import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import "../language/i18n";
import { MorePlease } from "./more-please";

/*
 * The foot of a lazily loaded list, and what fetches the next page.
 *
 * The trick it implements is the page before the one you need: the observer
 * counts this as visible while it is still below the fold, so the request
 * goes out about three rows early and the list never stops under anybody.
 *
 * Every observer this makes is recorded, so a test can say "this came into
 * view" -- jsdom has no layout and would otherwise never fire one.
 */

const observers: {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  disconnected: boolean;
}[] = [];

class FakeObserver {
  private readonly record;

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.record = { callback, options, disconnected: false };
    observers.push(this.record);
  }

  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
  disconnect() {
    this.record.disconnected = true;
  }
}

vi.stubGlobal("IntersectionObserver", FakeObserver);

const comeIntoView = () => {
  const latest = observers.at(-1);
  latest?.callback(
    [{ isIntersecting: true } as IntersectionObserverEntry],
    latest as unknown as IntersectionObserver,
  );
};

const renderSentinel = (
  props: Partial<React.ComponentProps<typeof MorePlease>> = {},
) => {
  const onReached = vi.fn();
  const view = render(
    <ThemeProvider theme={theme}>
      <MorePlease hasMore busy={false} onReached={onReached} {...props} />
    </ThemeProvider>,
  );
  return { onReached, ...view };
};

afterEach(() => {
  observers.length = 0;
});

describe("asking for the next page", () => {
  it("asks when the foot of the list comes into view", () => {
    const { onReached } = renderSentinel();

    comeIntoView();

    expect(onReached).toHaveBeenCalledTimes(1);
  });

  // The whole trick: the observer counts this as visible while it is still
  // below the fold, so the rows are there before anybody scrolls that far.
  it("counts itself visible before it actually is", () => {
    renderSentinel();

    expect(observers.at(-1)?.options?.rootMargin).toBe("0px 0px 220px 0px");
  });

  // Deliberately not the scrolling box, even where the list scrolls inside
  // one: the observer finds the nearest scrollable ancestor on its own, and
  // naming it would mean holding a ref to a box this does not own.
  it("does not name the thing it scrolls inside", () => {
    renderSentinel();

    expect(observers.at(-1)?.options?.root).toBeUndefined();
  });
});

describe("when not to ask", () => {
  it("watches nothing once there is nothing more to fetch", () => {
    renderSentinel({ hasMore: false });

    expect(observers).toHaveLength(0);
  });

  // A fast scroll would otherwise ask for the same page twice.
  it("watches nothing while a page is already in flight", () => {
    renderSentinel({ busy: true });

    expect(observers).toHaveLength(0);
  });

  it("stops watching when it goes away", () => {
    const { unmount } = renderSentinel();

    unmount();

    expect(observers.at(-1)?.disconnected).toBe(true);
  });

  // jsdom, and any browser old enough to lack the API. The list still works;
  // it just ends where the first page ends.
  it("does nothing at all where the browser has no observer", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    expect(() => renderSentinel()).not.toThrow();

    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });
});

describe("what it shows", () => {
  it("shows nothing when the list has ended", () => {
    const { container } = renderSentinel({ hasMore: false, busy: false });

    expect(container).toBeEmptyDOMElement();
  });

  // Announced, so somebody on a screen reader reaching the end of the list is
  // told that more is coming.
  it("says a page is coming while one is", () => {
    renderSentinel({ busy: true });

    expect(screen.getByText("Loading more…")).toBeInTheDocument();
  });

  it("holds the space open between pages without saying anything", () => {
    const { container } = renderSentinel();

    expect(container.querySelector("output")).toBeInTheDocument();
    expect(container.querySelector("output")).toHaveTextContent("");
  });
});
