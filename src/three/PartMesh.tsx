import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  CylinderGeometry,
  EdgesGeometry,
  type Group,
  type LineBasicMaterial,
  type MeshStandardMaterial,
} from 'three';

import type { OrientationMark } from '@/data/types';
import { markPose } from '@/engine/marks';
import type { PartPose } from '@/engine/pose';
import { colors } from '@/ui/theme';

/**
 * One physical piece, drawn the way the paper manual draws it.
 *
 * DESIGN.md calls for a line-drawing look: canvas-white faces with ink edges,
 * blue edges on the part being fitted, and light grey on parts not yet reached.
 * The face mesh alone reads as a white blob on a white page, so the edge
 * overlay is what actually makes the geometry legible.
 */
export function PartMesh({
  pose,
  highlight,
  marks,
}: {
  pose: PartPose;
  highlight: boolean;
  /** Orientation stickers on this part, drawn as blue dots. */
  marks?: OrientationMark[];
}) {
  const group = useRef<Group>(null);
  const { part } = pose;

  const geometry = useMemo(
    () =>
      part.shape.kind === 'box'
        ? new BoxGeometry(...part.shape.size)
        : new CylinderGeometry(part.shape.r, part.shape.r, part.shape.h, part.shape.seg ?? 24),
    [part],
  );

  // 15° threshold keeps the silhouette and panel corners while dropping the
  // triangulation seams across flat faces.
  const edges = useMemo(() => new EdgesGeometry(geometry, 15), [geometry]);

  // Geometries passed as props are not disposed by the renderer on unmount.
  useEffect(() => () => {
    geometry.dispose();
    edges.dispose();
  }, [geometry, edges]);

  const edgeColor = highlight
    ? colors.edge.active
    : pose.state === 'pending'
      ? colors.edge.pending
      : colors.edge.normal;

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;

    // Frame-rate independent exponential ease.
    const k = 1 - Math.exp(-delta * 9);
    g.position.x += (pose.target[0] - g.position.x) * k;
    g.position.y += (pose.target[1] - g.position.y) * k;
    g.position.z += (pose.target[2] - g.position.z) * k;

    const [faceObj, edgeObj] = g.children;
    const face = (faceObj as { material?: MeshStandardMaterial })?.material;
    const edge = (edgeObj as { material?: LineBasicMaterial })?.material;
    if (!face || !edge) return;

    face.opacity += (pose.opacity - face.opacity) * k;
    // Edges carry the drawing, so they stay readable while a part is ghosted.
    const edgeTarget = pose.opacity > 0.02 ? Math.max(pose.opacity, 0.35) : 0;
    edge.opacity += (edgeTarget - edge.opacity) * k;
    g.visible = face.opacity > 0.02 || edge.opacity > 0.02;
  });

  return (
    <group ref={group} position={pose.target} rotation={part.rotation ?? [0, 0, 0]}>
      {/* A part that has not been fitted yet is drawn as a ghost, so it must
          not drop a solid contact shadow on the floor as though it were there. */}
      <mesh geometry={geometry} castShadow={pose.state !== 'pending'} receiveShadow>
        <meshStandardMaterial
          color={highlight ? colors.blueDim : colors.mat[part.finish]}
          roughness={0.95}
          metalness={0}
          transparent
          opacity={pose.opacity}
          // Let the ink edges sit cleanly on top of the white faces.
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={edgeColor} transparent opacity={pose.opacity} />
      </lineSegments>
      {/* Stickers only on parts that are really there, not on ghosts. */}
      {pose.opacity > 0.5 &&
        marks?.map((m, i) => {
          const mp = markPose(part, m);
          return (
            <mesh key={i} position={mp.offset} rotation={mp.rotation}>
              <cylinderGeometry args={[mp.radius, mp.radius, 0.12, 24]} />
              <meshBasicMaterial color={colors.blue} />
            </mesh>
          );
        })}
    </group>
  );
}

/** Thin wireframe box showing the product's overall footprint. */
export function DimensionCage({ size, center }: { size: [number, number, number]; center: [number, number, number] }) {
  return (
    <mesh position={center}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={colors.blue} wireframe transparent opacity={0.4} />
    </mesh>
  );
}
