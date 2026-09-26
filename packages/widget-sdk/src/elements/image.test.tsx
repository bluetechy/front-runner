import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ImageElement } from "./image.js";
import type { ImageNode } from "../definition.js";

const picture = (extra: Partial<ImageNode> = {}): ImageNode => ({
  id: "logo",
  type: "image",
  src: "https://northwind.test/logo.png",
  alt: "Northwind",
  ...extra,
});

describe("a picture on a widget", () => {
  it("draws the source with the alternative text the author wrote", () => {
    render(<ImageElement node={picture()} />);
    expect(screen.getByAltText("Northwind")).toHaveAttribute(
      "src",
      "https://northwind.test/logo.png",
    );
  });

  // Decoration says so with an empty string, and an empty string is a real
  // answer: it tells a screen reader to skip the image rather than read a URL.
  it("keeps an empty alternative text rather than inventing one", () => {
    const { container } = render(<ImageElement node={picture({ alt: "" })} />);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  // A `src` is not a navigation, but a document is untrusted input however
  // carefully it was validated upstream.
  it("draws nothing at all for a source that is not a safe URL", () => {
    const { container } = render(
      <ImageElement node={picture({ src: "javascript:alert(1)" })} />,
    );
    expect(container.querySelector("img")).toBeNull();
  });

  // Nothing rather than a broken-image glyph: a widget missing a picture
  // should look like a widget, not like a page that failed.
  it("draws nothing for an empty source", () => {
    const { container } = render(<ImageElement node={picture({ src: " " })} />);
    expect(container.querySelector("img")).toBeNull();
  });

  // A widget below the fold costs nothing until it is scrolled to, and the
  // declared dimensions keep it from shifting the customer's page when it
  // lands.
  it("loads lazily and reserves the space the document gave it", () => {
    render(
      <ImageElement node={picture({ size: { width: 180, height: 180 } })} />,
    );
    const drawn = screen.getByAltText("Northwind");
    expect(drawn).toHaveAttribute("loading", "lazy");
    expect(drawn).toHaveAttribute("width", "180");
  });
});
