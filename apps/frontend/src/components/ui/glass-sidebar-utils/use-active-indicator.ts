import * as React from "react";

export interface ActiveIndicatorRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Tracks the bounding box of the active element inside a scrollable container
 * so a sliding highlight surface can animate between navigation items.
 */
export function useActiveIndicator(
  containerRef: React.RefObject<HTMLElement | null>,
  selector: string,
): ActiveIndicatorRect | null {
  const [rect, setRect] = React.useState<ActiveIndicatorRect | null>(null);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const target = container.querySelector<HTMLElement>(selector);
      if (!target) {
        setRect(null);
        return;
      }

      const next: ActiveIndicatorRect = {
        left: target.offsetLeft,
        top: target.offsetTop,
        width: target.offsetWidth,
        height: target.offsetHeight,
      };

      setRect((prev) => {
        if (
          prev &&
          prev.left === next.left &&
          prev.top === next.top &&
          prev.width === next.width &&
          prev.height === next.height
        ) {
          return prev;
        }
        return next;
      });
    };

    update();

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => update()) : null;
    observer?.observe(container);

    const mutationObserver =
      typeof MutationObserver !== "undefined" ? new MutationObserver(() => update()) : null;
    mutationObserver?.observe(container, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-current", "data-collapsed", "class"],
      childList: true,
    });

    window.addEventListener("resize", update);

    return () => {
      observer?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [containerRef, selector]);

  return rect;
}
