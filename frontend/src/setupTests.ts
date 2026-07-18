import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement these, but Radix's Select (and other popper-based primitives)
// call them when opening/scrolling - without a stub, interacting with them in tests throws.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.scrollIntoView ??= () => {};
