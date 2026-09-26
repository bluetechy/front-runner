/*
 * The document the box starts on.
 *
 * A page whose one control is an empty text area does not say what it wants, so
 * the studio opens with a working widget: a dark banner with a headline, a
 * countdown and a button, which is about the simplest thing that uses three
 * different elements and still looks like something somebody would ship.
 *
 * It is a *working* document, not a sketch. Pressing Save and then Publish
 * without touching it puts a real widget on a real id, which is the fastest way
 * to see the whole path end to end -- and because it lists client-gui's origin,
 * it can be rendered there immediately. That is the one reason the origin is
 * hard-coded to a development address: see apps/client-gui/README.md.
 *
 * It is not translated. The interface is; a widget's own copy belongs to
 * whoever writes the widget.
 */
export const EXAMPLE = `{
  "schemaVersion": "1.0",
  "name": "Black Friday banner",
  "canvas": { "width": 1200, "height": 300 },
  "layout": { "type": "flow" },
  "delivery": { "allowedOrigins": ["http://localhost:5174"] },
  "root": {
    "id": "root",
    "type": "container",
    "layout": {
      "direction": "row",
      "align": "center",
      "justify": "space-between",
      "padding": 40,
      "gap": 24,
      "stackBelow": 640
    },
    "style": { "background": "#111111", "color": "#f5f5f5" },
    "children": [
      {
        "id": "headline",
        "type": "text",
        "value": "BLACK FRIDAY",
        "variant": "title",
        "style": { "fontSize": 40, "fontWeight": 800 }
      },
      {
        "id": "clock",
        "type": "countdown",
        "target": "2026-11-27T00:00:00-07:00",
        "format": "DD:HH:MM:SS",
        "expired": { "behavior": "replace", "text": "THE SALE IS LIVE" }
      },
      {
        "id": "cta",
        "type": "button",
        "label": "SHOP NOW",
        "variant": "primary",
        "style": { "background": "#d1258f", "color": "#ffffff" },
        "action": { "type": "navigate", "url": "/black-friday" }
      }
    ]
  }
}`;
