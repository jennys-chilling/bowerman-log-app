import { useEffect, useRef } from 'react';

const BLOCKED_DRAG_SELECTOR = [
  'button',
  'input',
  'textarea',
  'select',
  'option',
  'a',
  '[contenteditable="true"]',
  '[data-no-drag-scroll]',
].join(', ');

const DRAG_THRESHOLD_PX = 6;

const isBlockedDragTarget = (target) => {
  if (!(target instanceof Element)) return true;
  return Boolean(target.closest(BLOCKED_DRAG_SELECTOR));
};

const getNestedScrollable = (target, root) => {
  let node = target instanceof Element ? target : null;

  while (node && node !== root) {
    const style = window.getComputedStyle(node);
    const canScrollY = (style.overflowY === 'auto' || style.overflowY === 'scroll')
      && node.scrollHeight > node.clientHeight + 1;
    const canScrollX = (style.overflowX === 'auto' || style.overflowX === 'scroll')
      && node.scrollWidth > node.clientWidth + 1;

    if (canScrollY || canScrollX) {
      return node;
    }

    node = node.parentElement;
  }

  return null;
};

/**
 * Click-and-drag scrolling on a scroll container.
 * Distinguishes drags from clicks so calendar cells can stay tappable/clickable.
 */
export function useDragScroll({
  enabled = true,
  scrollRef: externalScrollRef,
  verticalScrollTarget = 'element',
} = {}) {
  const internalScrollRef = useRef(null);
  const scrollRef = externalScrollRef || internalScrollRef;
  const dragStateRef = useRef(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    const element = scrollRef.current;
    if (!element) return undefined;

    const releaseCapture = (pointerId) => {
      if (pointerId != null && element.hasPointerCapture?.(pointerId)) {
        element.releasePointerCapture(pointerId);
      }
    };

    const finishDrag = (pointerId) => {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== pointerId) return;

      if (state.moved) {
        suppressClickRef.current = true;
      }

      releaseCapture(pointerId);
      dragStateRef.current = null;
      element.classList.remove('btc-drag-scroll-active');
    };

    const cancelActiveDrag = () => {
      const state = dragStateRef.current;
      if (!state) return;
      finishDrag(state.pointerId);
    };

    const handlePointerDown = (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (isBlockedDragTarget(event.target)) return;
      if (getNestedScrollable(event.target, element)) return;

      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop,
        windowScrollY: window.scrollY,
        moved: false,
        captured: false,
      };
    };

    const handlePointerMove = (event) => {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - state.startX;
      const deltaY = event.clientY - state.startY;

      if (!state.moved) {
        if (Math.abs(deltaX) < DRAG_THRESHOLD_PX && Math.abs(deltaY) < DRAG_THRESHOLD_PX) {
          return;
        }

        state.moved = true;
        element.classList.add('btc-drag-scroll-active');

        if (!state.captured) {
          element.setPointerCapture(event.pointerId);
          state.captured = true;
        }
      }

      event.preventDefault();
      element.scrollLeft = state.scrollLeft - deltaX;

      if (verticalScrollTarget === 'window') {
        window.scrollTo({ top: state.windowScrollY - deltaY, left: window.scrollX });
      } else {
        element.scrollTop = state.scrollTop - deltaY;
      }
    };

    const handlePointerUp = (event) => {
      finishDrag(event.pointerId);
    };

    const handlePointerCancel = (event) => {
      finishDrag(event.pointerId);
    };

    const handleClickCapture = (event) => {
      if (!suppressClickRef.current) return;
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    };

    const handleTouchStart = (event) => {
      if (event.touches.length >= 2) {
        cancelActiveDrag();
      }
    };

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove, { passive: false });
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerCancel);
    element.addEventListener('click', handleClickCapture, true);
    element.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerCancel);
      element.removeEventListener('click', handleClickCapture, true);
      element.removeEventListener('touchstart', handleTouchStart);
      element.classList.remove('btc-drag-scroll-active');
      dragStateRef.current = null;
      suppressClickRef.current = false;
    };
  }, [enabled, scrollRef, verticalScrollTarget]);

  return scrollRef;
}
