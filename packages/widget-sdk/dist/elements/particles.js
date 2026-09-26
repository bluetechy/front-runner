import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { placementOf } from "../style.js";
import { useRuntime } from "../runtime.js";
/*
 * Falling snow, or confetti. The one element in this package drawn on a
 * canvas, and the reason there is a canvas at all.
 *
 * **Why this one and not the rest.** Two hundred flakes are two hundred DOM
 * nodes, two hundred style recalculations and a layout every frame in HTML;
 * on a canvas they are one element and a paint loop. They are also the case
 * where leaving the DOM costs nothing: snow is not a control, carries no
 * words, and has nothing a screen reader should be told about. So the canvas
 * is `aria-hidden` and the widget reads exactly the same with it and without
 * it.
 *
 * That is the whole test, and it is worth writing down because the pull is
 * always the other way. A button painted onto a canvas is a button whose
 * focus, keyboard handling, hit testing and accessible name have to be
 * rebuilt by us, badly, in a language the browser already speaks. Text
 * painted onto a canvas cannot be selected, found, translated or resized.
 * Canvas is for pixels that are only ever pixels.
 *
 * The element is decoration, so it is absolutely positioned across its
 * container and ignores pointer events: a hotspot underneath it stays
 * clickable, which it would not be if a canvas sat over the top catching
 * clicks.
 */
/* Particles per 10,000 square pixels, and the ceiling whatever the document
 * asks for. A definition is not allowed to make somebody's phone warm: the
 * author chooses the look, the runtime keeps the cost. */
const DEFAULT_DENSITY = 8;
const MAX_DENSITY = 24;
const MAX_PARTICLES = 400;
const CONFETTI_COLORS = ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#d1258f"];
function makeParticles(effect, width, height, density) {
    const area = (width * height) / 10_000;
    const count = Math.min(MAX_PARTICLES, Math.round(area * density));
    return Array.from({ length: count }, (_unused, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: effect === "snow" ? 1 + Math.random() * 2.5 : 2 + Math.random() * 3,
        speed: effect === "snow" ? 0.3 + Math.random() : 1.2 + Math.random() * 2,
        drift: (Math.random() - 0.5) * 0.6,
        angle: Math.random() * Math.PI * 2,
        color: effect === "snow"
            ? "#ffffff"
            : CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    }));
}
export function ParticlesElement({ node }) {
    const { mode } = useRuntime();
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext?.("2d");
        if (!canvas || !context)
            return;
        /* Somebody who has asked their operating system for less motion has asked
         * for this in particular. Nothing is drawn at all: static snow is not a
         * gentler version of falling snow, it is a grey speckle over a banner. */
        const still = window.matchMedia?.("(prefers-reduced-motion: reduce)");
        if (still?.matches)
            return;
        const density = Math.min(node.density ?? DEFAULT_DENSITY, MAX_DENSITY);
        let width = canvas.clientWidth || 1;
        let height = canvas.clientHeight || 1;
        let particles = makeParticles(node.effect, width, height, density);
        let frame = 0;
        /* The canvas is sized in device pixels and scaled back down, or everything
         * on it is soft on a retina screen: `clientWidth` is CSS pixels and the
         * backing store is not. */
        const resize = () => {
            const ratio = window.devicePixelRatio || 1;
            width = canvas.clientWidth || 1;
            height = canvas.clientHeight || 1;
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            particles = makeParticles(node.effect, width, height, density);
        };
        resize();
        const observer = typeof ResizeObserver === "undefined"
            ? null
            : new ResizeObserver(() => resize());
        observer?.observe(canvas);
        const draw = () => {
            context.clearRect(0, 0, width, height);
            for (const particle of particles) {
                particle.y += particle.speed;
                particle.angle += 0.02;
                particle.x += particle.drift + Math.sin(particle.angle) * 0.4;
                /* Off the bottom is back to the top, which is what makes a handful of
                 * particles look like weather rather than a handful of particles. */
                if (particle.y - particle.radius > height) {
                    particle.y = -particle.radius;
                    particle.x = Math.random() * width;
                }
                if (particle.x < -particle.radius)
                    particle.x = width + particle.radius;
                if (particle.x > width + particle.radius)
                    particle.x = -particle.radius;
                context.beginPath();
                context.fillStyle = particle.color;
                if (node.effect === "snow") {
                    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                    context.fill();
                }
                else {
                    /* Confetti is a rectangle turning on its own axis, which is the
                     * cheapest thing that reads as a piece of paper rather than a dot. */
                    context.save();
                    context.translate(particle.x, particle.y);
                    context.rotate(particle.angle);
                    context.fillRect(-particle.radius, -particle.radius / 2, particle.radius * 2, particle.radius);
                    context.restore();
                }
            }
            frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
        /* Both of these matter. A widget unmounted with its loop still running is
         * a page that never goes quiet, and a widget on a tab nobody is looking at
         * is a paint loop nobody is looking at: `requestAnimationFrame` is already
         * throttled by the browser in a background tab, which is the other reason
         * this is a frame loop rather than an interval. */
        return () => {
            cancelAnimationFrame(frame);
            observer?.disconnect();
        };
    }, [node.effect, node.density]);
    return (_jsx("canvas", { ref: canvasRef, "data-widget-node": node.id, "aria-hidden": "true", style: {
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            /* Clicks go through to whatever is underneath. A canvas laid over a
             * banner would otherwise swallow the button it is snowing on. */
            pointerEvents: "none",
            ...placementOf(node, mode),
        } }));
}
//# sourceMappingURL=particles.js.map