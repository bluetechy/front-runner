import { ButtonElement } from "./elements/button.js";
import { ContainerElement } from "./elements/container.js";
import { CountdownElement } from "./elements/countdown.js";
import { HotspotElement } from "./elements/hotspot.js";
import { ImageElement } from "./elements/image.js";
import { ParticlesElement } from "./elements/particles.js";
import { ProgressBarElement } from "./elements/progress-bar.js";
import { TextElement } from "./elements/text.js";
import type { ComponentType } from "react";
import type { ElementProps } from "./elements/element-props.js";
import type { NodeType, WidgetNode } from "./definition.js";

/*
 * Every element type this runtime knows how to draw, and the component that
 * draws it.
 *
 * A registry rather than a switch inside the renderer, which is a small
 * difference with one large consequence: adding a capability to the platform
 * is a component and a line here, and the renderer never changes. The schema
 * grows the same way at the other end, and the two lists are the contract.
 *
 * The keys are the whole vocabulary. An author -- a person today, a model
 * later -- can compose anything out of these eight and cannot invent a ninth,
 * because a type that is not a key here renders as nothing and the API refuses
 * the document before it ever gets that far.
 */

/* The component for a node of type K, narrowed to that node. Written out
 * rather than left as `ComponentType<ElementProps<WidgetNode>>` so that
 * `TextElement` cannot be registered under "button": the compiler checks each
 * entry against the node type its key names. */
type Registry = {
  [K in NodeType]: ComponentType<
    ElementProps<Extract<WidgetNode, { type: K }>>
  >;
};

export const registry: Registry = {
  container: ContainerElement,
  text: TextElement,
  image: ImageElement,
  button: ButtonElement,
  hotspot: HotspotElement,
  countdown: CountdownElement,
  progressBar: ProgressBarElement,
  particles: ParticlesElement,
};

/* The vocabulary as data, for the tests at either end of the contract: this is
 * the list `widget.schema.json` has to match, and a test in main-api reads the
 * schema's side of it. */
export const elementTypes = Object.keys(registry) as NodeType[];
