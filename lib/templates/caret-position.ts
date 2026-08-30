// Classic "mirror div" technique: <textarea> exposes no API for the pixel
// position of the caret, so we clone it into an invisible, identically
// styled <div>, insert a marker <span> at the caret index, and measure that
// span's position. No dependency needed.

const MIRRORED_PROPERTIES: (keyof CSSStyleDeclaration)[] = [
  "boxSizing",
  "width",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "lineHeight",
  "textTransform",
  "wordSpacing",
  "textIndent",
  "whiteSpace",
  "wordWrap",
];

export type CaretCoordinates = { top: number; left: number; height: number };

/**
 * Returns the caret's position relative to the textarea's own top-left
 * corner (i.e. add the textarea's own getBoundingClientRect() offset, and
 * subtract its scrollTop/scrollLeft, to get viewport coordinates).
 */
export function getCaretCoordinates(el: HTMLTextAreaElement, index: number): CaretCoordinates {
  const div = document.createElement("div");
  const style = window.getComputedStyle(el);

  for (const prop of MIRRORED_PROPERTIES) {
    // CSSStyleDeclaration values are always strings at runtime for these props.
    (div.style as unknown as Record<string, string>)[prop as string] = style[prop] as string;
  }

  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.top = "0";
  div.style.left = "-9999px";
  div.style.height = "auto";
  div.style.width = `${el.clientWidth}px`;

  document.body.appendChild(div);

  div.textContent = el.value.slice(0, index);
  const marker = document.createElement("span");
  marker.textContent = el.value.slice(index) || ".";
  div.appendChild(marker);

  const coords: CaretCoordinates = {
    top: marker.offsetTop - el.scrollTop,
    left: marker.offsetLeft - el.scrollLeft,
    height: marker.offsetHeight,
  };

  document.body.removeChild(div);
  return coords;
}
