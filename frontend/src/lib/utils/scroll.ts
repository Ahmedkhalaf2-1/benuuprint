/**
 * Centres `child` inside the horizontally scrolling `container`, in LTR and RTL.
 * It works from on-screen rectangles instead of `offsetLeft`, because in RTL the scroll origin and `scrollLeft` sign differ per
 * engine: moving by the measured delta is correct everywhere (the scroll position always increases toward the right).
 */
export function scrollChildToCenter(container: HTMLElement, child: HTMLElement, smooth: boolean): void {
  const c = container.getBoundingClientRect();
  const k = child.getBoundingClientRect();
  const delta = k.left + k.width / 2 - (c.left + c.width / 2);
  container.scrollTo({ left: container.scrollLeft + delta, behavior: smooth ? "smooth" : "auto" });
}

/** 0..1 progress of a horizontal scroller from its start edge (left in LTR, right in RTL) to its end. */
export function scrollProgress(el: HTMLElement): number {
  const max = el.scrollWidth - el.clientWidth;
  return max <= 0 ? 0 : Math.min(1, Math.abs(el.scrollLeft) / max);
}
