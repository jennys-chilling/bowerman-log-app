import { useEffect, useRef } from 'react';

const getTouchDistance = (touches) => Math.hypot(
  touches[0].clientX - touches[1].clientX,
  touches[0].clientY - touches[1].clientY
);

const getTouchMidpoint = (touches) => ({
  x: (touches[0].clientX + touches[1].clientX) / 2,
  y: (touches[0].clientY + touches[1].clientY) / 2,
});

/**
 * Pinch-to-zoom on a scroll container. Keeps scroll focus near the pinch midpoint.
 */
export function usePinchZoom({
  enabled = true,
  scrollRef: externalScrollRef,
  zoom,
  onZoomChange,
  zoomMin = 0.35,
  zoomMax = 1.2,
}) {
  const internalScrollRef = useRef(null);
  const scrollRef = externalScrollRef || internalScrollRef;
  const zoomRef = useRef(zoom);
  const pinchStateRef = useRef(null);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    if (!enabled || !onZoomChange) return undefined;

    const scrollElement = scrollRef.current;
    if (!scrollElement) return undefined;

    const clampZoom = (nextZoom) => Math.min(zoomMax, Math.max(zoomMin, Number(nextZoom.toFixed(2))));

    const handleTouchStart = (event) => {
      if (event.touches.length !== 2) return;

      event.preventDefault();
      const rect = scrollElement.getBoundingClientRect();
      const midpoint = getTouchMidpoint(event.touches);

      pinchStateRef.current = {
        startDistance: getTouchDistance(event.touches),
        startZoom: zoomRef.current,
        focusXRatio: (scrollElement.scrollLeft + midpoint.x - rect.left) / Math.max(scrollElement.scrollWidth, 1),
        focusYRatio: (scrollElement.scrollTop + midpoint.y - rect.top) / Math.max(scrollElement.scrollHeight, 1),
        localX: midpoint.x - rect.left,
        localY: midpoint.y - rect.top,
      };
    };

    const handleTouchMove = (event) => {
      const pinchState = pinchStateRef.current;
      if (!pinchState || event.touches.length !== 2) return;

      event.preventDefault();
      const distance = getTouchDistance(event.touches);
      if (pinchState.startDistance <= 0) return;

      const nextZoom = clampZoom(pinchState.startZoom * (distance / pinchState.startDistance));
      onZoomChange(nextZoom);

      window.requestAnimationFrame(() => {
        scrollElement.scrollLeft = (scrollElement.scrollWidth * pinchState.focusXRatio) - pinchState.localX;
        scrollElement.scrollTop = (scrollElement.scrollHeight * pinchState.focusYRatio) - pinchState.localY;
      });
    };

    const handleTouchEnd = (event) => {
      if (event.touches.length < 2) {
        pinchStateRef.current = null;
      }
    };

    scrollElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    scrollElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollElement.addEventListener('touchend', handleTouchEnd);
    scrollElement.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      scrollElement.removeEventListener('touchstart', handleTouchStart);
      scrollElement.removeEventListener('touchmove', handleTouchMove);
      scrollElement.removeEventListener('touchend', handleTouchEnd);
      scrollElement.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enabled, onZoomChange, scrollRef, zoomMax, zoomMin]);

  return scrollRef;
}
