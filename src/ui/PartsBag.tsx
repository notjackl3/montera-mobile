import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HARDWARE } from '@/data/hardware';
import type { Hardware, Product, Step } from '@/data/types';
import { bagFor, lettersFor, lookalikes } from '@/engine/letters';
import {
  CARD_LONG_MM,
  CARD_MAX_PT,
  CARD_MIN_PT,
  CARD_SHORT_MM,
  DEFAULT_PT_PER_MM,
  ptPerMmFromCard,
  scaleLabel,
} from '@/engine/truesize';
import { useApp } from '@/store/useApp';

import { Button, Row } from './components';
import { LetterBadge } from './LetterBadge';
import { Sheet } from './Sheet';
import { FittingSilhouette } from './Silhouette';
import { HardwareGlyph } from './Thumb';
import { colors, radius, space, type } from './theme';

type View_ =
  | { kind: 'list' }
  | { kind: 'detail'; id: string }
  | { kind: 'compare'; a: string; b: string }
  | { kind: 'calibrate'; back: View_ };

/**
 * The parts bag: every fitting in the box with its letter, the ones this step
 * needs first. Tap a fitting for a 1:1 drawing to hold a real one against, and
 * Compare for its look-alike at the same scale.
 *
 * In the study, people did not realise a screw row was tappable, so rows carry
 * a chevron and a full-row press state.
 */
export function PartsBag({
  product,
  step,
  focus,
  visible = true,
  onClose,
  asScreen,
}: {
  product: Product;
  step?: Step;
  /** Open straight on this fitting's 1:1 view. */
  focus?: string;
  visible?: boolean;
  onClose: () => void;
  /** Render as a full screen (route) rather than a bottom sheet. */
  asScreen?: boolean;
}) {
  const [view, setView] = useState<View_>(focus && HARDWARE[focus] ? { kind: 'detail', id: focus } : { kind: 'list' });
  const insets = useSafeAreaInsets();

  const letters = useMemo(() => lettersFor(product), [product]);
  const close = () => {
    setView({ kind: 'list' });
    onClose();
  };
  const back =
    view.kind === 'list'
      ? undefined
      : view.kind === 'calibrate'
        ? () => setView(view.back)
        : view.kind === 'compare'
          ? () => setView({ kind: 'detail', id: view.a })
          : () => setView({ kind: 'list' });

  const title =
    view.kind === 'list'
      ? 'Parts'
      : view.kind === 'calibrate'
        ? 'Set actual size'
        : view.kind === 'compare'
          ? `${letters[view.a]} or ${letters[view.b]}?`
          : `Part ${letters[view.id] ?? ''}`;

  const body = (
    <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: space(4) }} showsVerticalScrollIndicator={false}>
      {view.kind === 'list' && <BagList product={product} step={step} onPick={(id) => setView({ kind: 'detail', id })} />}
      {view.kind === 'detail' && (
        <Detail
          product={product}
          hardware={HARDWARE[view.id]}
          letter={letters[view.id]}
          qty={product.hardware.find((l) => l.id === view.id)?.qty ?? 0}
          onCompare={(b) => setView({ kind: 'compare', a: view.id, b })}
          onCalibrate={() => setView({ kind: 'calibrate', back: view })}
        />
      )}
      {view.kind === 'compare' && (
        <Compare
          a={HARDWARE[view.a]}
          b={HARDWARE[view.b]}
          letters={letters}
          onCalibrate={() => setView({ kind: 'calibrate', back: view })}
        />
      )}
      {view.kind === 'calibrate' && <Calibrate onDone={() => setView(view.back)} />}
    </ScrollView>
  );

  if (asScreen) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space(2), paddingHorizontal: space(4) }}>
        <Row gap={space(2)} style={{ marginBottom: space(3) }}>
          <Pressable onPress={back ?? close} hitSlop={8} style={s.iconBtn} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[type.title, { color: colors.text }]}>{title}</Text>
            <Text style={[type.small, { color: colors.textDim }]}>
              {product.name} {product.descriptor}
            </Text>
          </View>
        </Row>
        {body}
      </View>
    );
  }

  return (
    <Sheet visible={visible} onClose={close} onBack={back} title={title} tall={view.kind !== 'list'}>
      {body}
    </Sheet>
  );
}

/* ---------------------------------------------------------------------- list */

function BagList({ product, step, onPick }: { product: Product; step?: Step; onPick: (id: string) => void }) {
  const bag = bagFor(product, step);
  const now = bag.filter((b) => b.stepQty > 0);
  const rest = bag.filter((b) => b.stepQty === 0);

  if (bag.length === 0) {
    return <Text style={[type.body, { color: colors.textDim }]}>This build has no loose fittings.</Text>;
  }

  const row = (b: (typeof bag)[number], needed: boolean) => (
    <Pressable
      key={b.hardware.id}
      onPress={() => {
        Haptics.selectionAsync();
        onPick(b.hardware.id);
      }}
      style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.surfacePressed }]}
      accessibilityRole="button"
      accessibilityLabel={`Part ${b.letter}, ${b.hardware.short ?? b.hardware.name}. Show actual size`}
    >
      <LetterBadge letter={b.letter} muted={!needed} />
      <View style={s.glyphBox}>
        <HardwareGlyph glyph={b.hardware.glyph} size={26} color={colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.heading, { color: colors.text }]}>{b.hardware.short ?? b.hardware.name}</Text>
        <Text style={[type.body, { color: colors.textDim }]}>
          {needed ? `${b.stepQty} this step · ` : ''}
          {b.qty} in the bag{b.hardware.lengthMm ? ` · ${b.hardware.lengthMm} mm` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.ink} />
    </Pressable>
  );

  return (
    <View>
      {now.length > 0 && (
        <>
          <Text style={[type.micro, s.groupHead, { color: colors.blue }]}>THIS STEP</Text>
          {now.map((b) => row(b, true))}
          <Text style={[type.micro, s.groupHead, { color: colors.textFaint }]}>REST OF THE BAG</Text>
        </>
      )}
      {rest.map((b) => row(b, now.length === 0))}
      <Text style={[type.body, { color: colors.textDim, marginTop: space(3) }]}>Tap a part to see it at actual size.</Text>
    </View>
  );
}

/* -------------------------------------------------------------------- detail */

function useScale() {
  const ptPerMm = useApp((st) => st.ptPerMm);
  return { ptPerMm: ptPerMm ?? DEFAULT_PT_PER_MM, calibrated: ptPerMm !== undefined };
}

function ScaleNote({ hardware, onCalibrate }: { hardware: Hardware; onCalibrate: () => void }) {
  const { calibrated } = useScale();
  const label = scaleLabel(hardware, calibrated);
  if (label === 'estimate') {
    return (
      <Text style={[type.body, { color: colors.textDim }]}>
        Size estimated from photos, not measured. Do not match yours against this drawing.
      </Text>
    );
  }
  return (
    <Row gap={space(3)} style={{ flexWrap: 'wrap' }}>
      <Text style={[type.body, { color: label === 'actual' ? colors.text : colors.textDim, flexShrink: 1 }]}>
        {label === 'actual' ? 'Actual size. Hold yours against the screen.' : 'Not to scale yet.'}
      </Text>
      <Pressable onPress={onCalibrate} hitSlop={10} style={s.link}>
        <Text style={[type.body, { color: colors.blue, textDecorationLine: 'underline' }]}>
          {label === 'actual' ? 'Recalibrate' : 'Set actual size'}
        </Text>
      </Pressable>
    </Row>
  );
}

function Detail({
  product,
  hardware,
  letter,
  qty,
  onCompare,
  onCalibrate,
}: {
  product: Product;
  hardware: Hardware;
  letter?: string;
  qty: number;
  onCompare: (otherId: string) => void;
  onCalibrate: () => void;
}) {
  const { ptPerMm } = useScale();
  const twins = lookalikes(product, hardware.id);
  return (
    <View style={{ gap: space(4) }}>
      <Row gap={space(3)}>
        {letter && <LetterBadge letter={letter} size={44} />}
        <View style={{ flex: 1 }}>
          <Text style={[type.title, { color: colors.text }]}>{hardware.short ?? hardware.name}</Text>
          <Text style={[type.body, { color: colors.textDim }]}>
            {hardware.name} · {qty} in the bag
          </Text>
        </View>
      </Row>

      {hardware.lengthMm ? (
        <View style={s.drawing}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <FittingSilhouette hardware={hardware} ptPerMm={ptPerMm} />
          </ScrollView>
          <Text style={[type.heading, { color: colors.text, marginTop: space(2) }]}>{hardware.lengthMm} mm long</Text>
        </View>
      ) : (
        <View style={[s.drawing, { alignItems: 'center' }]}>
          <HardwareGlyph glyph={hardware.glyph} size={96} color={colors.ink} />
        </View>
      )}

      {hardware.lengthMm ? <ScaleNote hardware={hardware} onCalibrate={onCalibrate} /> : null}

      {twins.length > 0 && (
        <View style={{ gap: space(2) }}>
          <Text style={[type.body, { color: colors.text }]}>
            Looks like {twins.map((t) => `${t.short ?? t.name}`).join(', ')}.
          </Text>
          {twins.map((t) => (
            <Button
              key={t.id}
              label={`Compare with ${lettersFor(product)[t.id] ?? t.short}`}
              icon="git-compare-outline"
              variant="secondary"
              onPress={() => onCompare(t.id)}
            />
          ))}
        </View>
      )}

      {/* The six-digit code is small print, here only: people could not use it. */}
      <Text style={[type.small, { color: colors.textFaint }]}>IKEA part number {hardware.code}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------- compare */

function Compare({
  a,
  b,
  letters,
  onCalibrate,
}: {
  a: Hardware;
  b: Hardware;
  letters: Record<string, string>;
  onCalibrate: () => void;
}) {
  const { ptPerMm } = useScale();
  const [short, long] = (a.lengthMm ?? 0) <= (b.lengthMm ?? 0) ? [a, b] : [b, a];
  const diff = (long.lengthMm ?? 0) - (short.lengthMm ?? 0);
  return (
    <View style={{ gap: space(4) }}>
      <Text style={[type.body, { color: colors.text }]}>Same scale, heads lined up on the left.</Text>
      {[short, long].map((h) => (
        <View key={h.id} style={s.drawing}>
          <Row gap={space(2.5)} style={{ marginBottom: space(2) }}>
            {letters[h.id] && <LetterBadge letter={letters[h.id]} />}
            <Text style={[type.heading, { color: colors.text }]}>
              {h.short ?? h.name} · {h.lengthMm} mm
            </Text>
          </Row>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <FittingSilhouette hardware={h} ptPerMm={ptPerMm} />
          </ScrollView>
        </View>
      ))}
      {diff > 0 && (
        <View style={s.callout}>
          <Text style={[type.heading, { color: colors.ink }]}>
            {letters[long.id] ?? long.short} is {diff} mm longer.
          </Text>
        </View>
      )}
      <ScaleNote hardware={a} onCalibrate={onCalibrate} />
    </View>
  );
}

/* ----------------------------------------------------------------- calibrate */

/**
 * Bank-card calibration, as on the web app: drag until the box is exactly as
 * wide as the card's short edge. Device DPI is not trusted for this.
 */
function Calibrate({ onDone }: { onDone: () => void }) {
  const current = useApp((st) => st.ptPerMm);
  const calibrate = useApp((st) => st.calibrate);
  const [w, setW] = useState(Math.round((current ?? DEFAULT_PT_PER_MM) * CARD_SHORT_MM));
  const start = useRef(w);
  const clamp = (v: number) => Math.min(CARD_MAX_PT, Math.max(CARD_MIN_PT, v));

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Keep the gesture: the surrounding scroll view must not steal it.
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          start.current = w;
        },
        // The box is centred, so each edge moves half the width change.
        onPanResponderMove: (_, g) => setW(clamp(Math.round(start.current + g.dx * 2))),
      }),
    [w],
  );

  return (
    <View style={{ gap: space(4) }}>
      <Text style={[type.body, { color: colors.text }]}>
        Hold any bank card upright against the screen. Drag sideways until the yellow box is exactly as wide as the card.
      </Text>
      <View style={s.calArea} {...pan.panHandlers}>
        <View style={[s.card, { width: w, height: w * (CARD_LONG_MM / CARD_SHORT_MM) }]} />
      </View>
      <Row gap={space(2.5)}>
        <Button label="Narrower" icon="remove" variant="secondary" onPress={() => setW((v) => clamp(v - 2))} style={{ flex: 1 }} />
        <Button label="Wider" icon="add" variant="secondary" onPress={() => setW((v) => clamp(v + 2))} style={{ flex: 1 }} />
      </Row>
      <Button
        label="Save"
        icon="checkmark"
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          calibrate(ptPerMmFromCard(w));
          onDone();
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    minHeight: 72,
    paddingVertical: space(2.5),
    paddingHorizontal: space(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  groupHead: { marginTop: space(2), marginBottom: space(1) },
  glyphBox: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawing: {
    paddingVertical: space(4),
    paddingHorizontal: space(3),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hairline,
  },
  callout: { backgroundColor: colors.accent, borderRadius: radius.md, padding: space(3.5) },
  link: { minHeight: 48, justifyContent: 'center' },
  calArea: { height: 300, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-start' },
  card: { backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.ink, borderRadius: radius.md },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
