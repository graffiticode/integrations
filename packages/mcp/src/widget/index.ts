/**
 * Widget module exports for ChatGPT Apps / Skybridge integration
 */

export { generateFormWidgetHtml } from "./form-widget.js";

// MCP Resource URI for the form widget
export const WIDGET_RESOURCE_URI = "ui://graffiticode/form-widget.html";

// MIME type for Skybridge widgets
export const WIDGET_MIME_TYPE = "text/html+skybridge";

// Content Security Policy for the widget
// Allows the widget to embed iframes from api.graffiticode.org
export const WIDGET_CSP = {
  frame_domains: ["api.graffiticode.org"],
  connect_domains: ["api.graffiticode.org"],
};
