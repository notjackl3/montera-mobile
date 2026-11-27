import Svg, { Line, Path, Rect } from 'react-native-svg';

import type { Hardware } from '@/data/types';
import { silhouette } from '@/engine/truesize';
import { colors } from './theme';

/**
 * A fitting drawn side-on at `ptPerMm`, head on the left. Line drawing, like
 * the 3D view: white fill, ink outline. Total length includes the head, the way
 * IKEA states screw lengths.
 */
export function FittingSilhouette({ hardware, ptPerMm }: { hardware: Hardware; ptPerMm: number }) {
  const sil = silhouette(hardware, ptPerMm);
  if (!sil) return null;
  const { lengthPt: L, widthPt: w, headPt } = sil;
  const H = Math.max(w, headPt);
  const pad = 2;
  const cy = H / 2 + pad;
  const stroke = { stroke: colors.ink, strokeWidth: 1.5, fill: colors.surface };

  if (hardware.glyph === 'dowel') {
    const grooves = Math.max(3, Math.round(L / (3 * ptPerMm)));
    return (
      <Svg width={L + pad * 2} height={H + pad * 2}>
        <Rect x={pad} y={cy - w / 2} width={L} height={w} rx={w * 0.35} {...stroke} />
        {Array.from({ length: grooves }, (_, i) => {
          const x = pad + (L * (i + 1)) / (grooves + 1);
          return <Line key={i} x1={x} y1={cy - w / 2 + 1} x2={x} y2={cy + w / 2 - 1} stroke={colors.ink} strokeWidth={0.8} />;
        })}
      </Svg>
    );
  }

  const headLen = hardware.glyph === 'screw' ? Math.max(w * 0.7, 3) : Math.max(w * 0.4, 2);
  const tip = hardware.glyph === 'screw' || hardware.glyph === 'nail' ? Math.min(w * 1.4, L * 0.15) : 0;
  const shankEnd = pad + L - tip;
  const x0 = pad + headLen;
  // Head (flat or countersunk), shank, point.
  const body = [
    `M ${pad} ${cy - headPt / 2}`,
    `L ${x0} ${cy - w / 2}`,
    `L ${shankEnd} ${cy - w / 2}`,
    tip ? `L ${pad + L} ${cy}` : `L ${shankEnd} ${cy}`,
    `L ${shankEnd} ${cy + w / 2}`,
    `L ${x0} ${cy + w / 2}`,
    `L ${pad} ${cy + headPt / 2}`,
    'Z',
  ].join(' ');
  const threads = hardware.glyph === 'screw' ? Math.max(4, Math.round((shankEnd - x0) / (1.6 * ptPerMm))) : 0;

  return (
    <Svg width={L + pad * 2} height={H + pad * 2}>
      <Path d={body} {...stroke} strokeLinejoin="round" />
      {Array.from({ length: threads }, (_, i) => {
        const x = x0 + ((shankEnd - x0) * (i + 0.5)) / threads;
        return <Line key={i} x1={x - w * 0.2} y1={cy - w / 2} x2={x + w * 0.2} y2={cy + w / 2} stroke={colors.ink} strokeWidth={0.8} />;
      })}
    </Svg>
  );
}
