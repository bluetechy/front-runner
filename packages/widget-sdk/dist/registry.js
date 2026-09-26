import { ButtonElement } from "./elements/button.js";
import { ContainerElement } from "./elements/container.js";
import { CountdownElement } from "./elements/countdown.js";
import { HotspotElement } from "./elements/hotspot.js";
import { ImageElement } from "./elements/image.js";
import { ParticlesElement } from "./elements/particles.js";
import { ProgressBarElement } from "./elements/progress-bar.js";
import { TextElement } from "./elements/text.js";
export const registry = {
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
export const elementTypes = Object.keys(registry);
//# sourceMappingURL=registry.js.map