// Treat two distinct taps as a pause gesture, including just after page load.
export function createDoubleTapDetector(windowMs = 300) {
  let previous = -Infinity;
  return {
    tap(now) {
      const double = now > previous && now - previous <= windowMs;
      previous = double ? -Infinity : now;
      return double;
    },
    reset() { previous = -Infinity; },
  };
}
