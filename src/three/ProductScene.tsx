import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import type { Guide, Product } from '@/data/types';
import { boundsOf, fitDistance, partsFor, resolvePoses, type ViewMode } from '@/engine/pose';
import { colors } from '@/ui/theme';

import { DimensionCage, PartMesh } from './PartMesh';
import type { OrbitState } from './useOrbit';

type RigProps = {
  orbit: React.RefObject<OrbitState>;
  target: [number, number, number];
  baseDistance: number;
  autoRotate: boolean;
};

/** Drives the camera from the orbit ref, one assignment per frame. */
function CameraRig({ orbit, target, baseDistance, autoRotate }: RigProps) {
  const camera = useThree((s) => s.camera);

  useFrame((_, delta) => {
    const o = orbit.current;
    if (!o) return;
    if (autoRotate && !o.dragging) o.az += delta * 0.28;

    const dist = baseDistance * o.zoom;
    const sinPol = Math.sin(o.pol);
    camera.position.set(
      target[0] + dist * sinPol * Math.sin(o.az),
      target[1] + dist * Math.cos(o.pol),
      target[2] + dist * sinPol * Math.cos(o.az),
    );
    camera.lookAt(target[0], target[1], target[2]);
  });

  return null;
}

export type ProductSceneProps = {
  product: Product;
  guide?: Guide;
  mode: ViewMode;
  step?: number;
  spread?: number;
  ghostPending?: boolean;
  autoRotate?: boolean;
  showCage?: boolean;
  /** Render every part but this one as a faint ghost. */
  isolatePartId?: string | null;
  orbit: React.RefObject<OrbitState>;
  panHandlers?: Record<string, unknown>;
  style?: StyleProp<ViewStyle>;
};

/**
 * The 3D viewport.
 *
 * Every screen that shows a product renders this; the difference between the
 * hero view, the free viewer and the step-by-step build screen is only which
 * `mode` and `step` get passed in.
 */
export function ProductScene({
  product,
  guide,
  mode,
  step = 0,
  spread = 1,
  ghostPending = false,
  autoRotate = false,
  showCage = false,
  isolatePartId = null,
  orbit,
  panHandlers,
  style,
}: ProductSceneProps) {
  const { bounds, fittedDistance, floorSize } = useMemo(() => {
    const b = boundsOf(partsFor(product));
    return {
      bounds: b,
      fittedDistance: fitDistance(b.radius),
      floorSize: Math.max(b.size[0], b.size[2]) * 3.2,
    };
  }, [product]);

  // Exploding the model grows its effective radius, so pull the camera back by
  // the same factor or the outermost panels fall off the edge of the viewport.
  const baseDistance =
    mode === 'exploded' ? fittedDistance * (1 + 0.55 * (spread ?? 1)) : fittedDistance;

  const poses = useMemo(() => {
    const resolved = resolvePoses(product, guide, { mode, step, spread, ghostPending });
    if (!isolatePartId) return resolved;
    // Parts inspector: the chosen piece stays solid and lit, everything else
    // drops back far enough to read as context rather than geometry.
    return resolved.map((p) =>
      p.part.id === isolatePartId
        ? { ...p, state: 'active' as const, opacity: 1 }
        : { ...p, state: 'placed' as const, opacity: 0.1 },
    );
  }, [product, guide, mode, step, spread, ghostPending, isolatePartId]);

  // Orbit around the product's waist, not the floor, so it stays centred.
  const target: [number, number, number] = [0, bounds.center[1], 0];

  return (
    <View style={style} {...panHandlers}>
      <Canvas
        shadows
        camera={{ fov: 40, near: 1, far: baseDistance * 14, position: [baseDistance, baseDistance, baseDistance] }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[colors.canvas]} />

        {/* Flat, even light: the drawing is carried by the edges, so faces only
            need enough shading to tell one panel from the next. */}
        <ambientLight intensity={1.35} />
        <hemisphereLight args={[0xffffff, 0xd8d8d2, 0.7]} />
        <directionalLight
          position={[bounds.radius * 1.4, bounds.radius * 2.8, bounds.radius * 1.8]}
          intensity={0.75}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-bounds.radius * 2}
          shadow-camera-right={bounds.radius * 2}
          shadow-camera-top={bounds.radius * 2}
          shadow-camera-bottom={-bounds.radius * 2}
          shadow-camera-far={bounds.radius * 8}
        />

        <CameraRig orbit={orbit} target={target} baseDistance={baseDistance} autoRotate={autoRotate} />

        {poses.map((pose) => (
          <PartMesh key={pose.part.id} pose={pose} highlight={pose.state === 'active'} />
        ))}

        {showCage && <DimensionCage size={bounds.size} center={bounds.center} />}

        {/* DESIGN.md: no visible floor edge, only a soft contact shadow. A
            ShadowMaterial plane is invisible except where the product shades it. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]} receiveShadow>
          <planeGeometry args={[floorSize, floorSize]} />
          <shadowMaterial opacity={0.14} />
        </mesh>
      </Canvas>
    </View>
  );
}
