import { useMemo, useRef } from 'react';
import { PanResponder } from 'react-native';

export type OrbitState = {
  /** Horizontal angle, radians. */
  az: number;
  /** Vertical angle from +Y, radians. Clamped away from the poles. */
  pol: number;
  /** Multiplier on the fitted camera distance. */
  zoom: number;
  /** Set while a finger is down, so auto-rotate can yield to the user. */
  dragging: boolean;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Touch orbit for the 3D viewport.
 *
 * Built on PanResponder rather than gesture-handler so the camera can be driven
 * from a plain ref that `useFrame` reads directly — no bridge hop per frame, and
 * no worklet/reanimated coupling inside the GL tree.
 */
export function useOrbit(initial?: Partial<OrbitState>) {
  const state = useRef<OrbitState>({
    az: initial?.az ?? 0.7,
    pol: initial?.pol ?? 1.12,
    zoom: initial?.zoom ?? 1,
    dragging: false,
  });

  const start = useRef({ az: 0, pol: 0, zoom: 1, pinch: 0, touches: 0 });

  const pinchDistance = (touches: readonly { pageX: number; pageY: number }[]) =>
    Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: (evt) => {
          const t = evt.nativeEvent.touches;
          state.current.dragging = true;
          start.current = {
            az: state.current.az,
            pol: state.current.pol,
            zoom: state.current.zoom,
            pinch: t.length >= 2 ? pinchDistance(t) : 0,
            touches: t.length,
          };
        },

        onPanResponderMove: (evt, g) => {
          const t = evt.nativeEvent.touches;

          // Re-baseline whenever the number of fingers changes, otherwise the
          // first frame after a second finger lands snaps the camera.
          if (t.length !== start.current.touches) {
            start.current = {
              az: state.current.az,
              pol: state.current.pol,
              zoom: state.current.zoom,
              pinch: t.length >= 2 ? pinchDistance(t) : 0,
              touches: t.length,
            };
            return;
          }

          if (t.length >= 2 && start.current.pinch > 0) {
            const ratio = start.current.pinch / Math.max(pinchDistance(t), 1);
            state.current.zoom = clamp(start.current.zoom * ratio, 0.35, 3.2);
            return;
          }

          state.current.az = start.current.az - g.dx * 0.009;
          state.current.pol = clamp(start.current.pol - g.dy * 0.007, 0.18, 1.52);
        },

        onPanResponderRelease: () => {
          state.current.dragging = false;
        },
        onPanResponderTerminate: () => {
          state.current.dragging = false;
        },
      }),
    [],
  );

  const reset = () => {
    state.current.az = initial?.az ?? 0.7;
    state.current.pol = initial?.pol ?? 1.12;
    state.current.zoom = initial?.zoom ?? 1;
  };

  /** Animate toward a framing supplied by the current step. */
  const aim = (az: number, pol: number) => {
    if (state.current.dragging) return;
    state.current.az = az;
    // Clamp exactly as dragging does, so a step cannot park the camera below
    // the floor plane and then snap the moment the user touches the model.
    state.current.pol = clamp(pol, 0.18, 1.52);
  };

  return { state, panHandlers: responder.panHandlers, reset, aim };
}
