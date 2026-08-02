export interface TimeAnchor {
  orig: number;
  actual: number;
}

/**
 * Interpolates an original timestamp using the provided list of manual anchors.
 * Supports linear scaling for single anchor and extrapolation for bounds.
 */
export function interpolateTime(tOrig: number, anchors: TimeAnchor[]): number {
  if (anchors.length === 0) {
    return tOrig;
  }

  // Sort anchors by original time
  const sorted = [...anchors].sort((a, b) => a.orig - b.orig);

  // Exact match check
  const exact = sorted.find(a => Math.abs(a.orig - tOrig) < 0.0001);
  if (exact) {
    return exact.actual;
  }

  // If there's only 1 anchor
  if (sorted.length === 1) {
    const anchor = sorted[0];
    if (anchor.orig === 0) {
      return tOrig + anchor.actual;
    }
    // Scale relative to 0
    return (anchor.actual / anchor.orig) * tOrig;
  }

  // Find bounding anchors
  let left: TimeAnchor | null = null;
  let right: TimeAnchor | null = null;

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].orig <= tOrig) {
      left = sorted[i];
    }
    if (sorted[i].orig >= tOrig && !right) {
      right = sorted[i];
    }
  }

  // Case 1: tOrig is between left and right
  if (left && right && left.orig !== right.orig) {
    const ratio = (tOrig - left.orig) / (right.orig - left.orig);
    return left.actual + ratio * (right.actual - left.actual);
  }

  // Case 2: tOrig is before the first anchor (left is null)
  if (!left) {
    const a1 = sorted[0];
    const a2 = sorted[1];
    if (a2.orig === a1.orig) return a1.actual;
    const scale = (a2.actual - a1.actual) / (a2.orig - a1.orig);
    return a1.actual + scale * (tOrig - a1.orig);
  }

  // Case 3: tOrig is after the last anchor (right is null)
  if (!right) {
    const a1 = sorted[sorted.length - 2];
    const a2 = sorted[sorted.length - 1];
    if (a2.orig === a1.orig) return a2.actual;
    const scale = (a2.actual - a1.actual) / (a2.orig - a1.orig);
    return a2.actual + scale * (tOrig - a2.orig);
  }

  return tOrig;
}
