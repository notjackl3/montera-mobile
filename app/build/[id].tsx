import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGuide } from '@/data/guides';
import { HARDWARE } from '@/data/hardware';
import { getProduct } from '@/data/products';
import { ProductScene } from '@/three/ProductScene';
import { useOrbit } from '@/three/useOrbit';
import { fmtDuration, useApp } from '@/store/useApp';
import { Button, Chip, Empty, ProgressBar, Row, StatTile } from '@/ui/components';
import { HardwareGlyph } from '@/ui/Thumb';
import { colors, radius, space, type } from '@/ui/theme';

export default function BuildScreen() {
  useKeepAwake();

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const product = getProduct(id);
  const guide = getGuide(id);

  const saved = useApp((st) => (id ? st.progress[id]?.step : undefined));
  const { setProgress, clearProgress, startSession, recordStep, finishSession } = useApp();

  const [step, setStep] = useState(saved ?? 0);
  const [done, setDone] = useState(false);
  const [ghost, setGhost] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const orbit = useOrbit({ az: 0.75, pol: 1.05 });
  const stepEnteredAt = useRef(Date.now());
  const startedAt = useRef(Date.now());

  const steps = guide?.steps ?? [];
  const current = steps[step];
  const total = steps.length;

  // One session per visit to this screen.
  useEffect(() => {
    if (!product) return;
    startSession(product.id, 'digital');
    startedAt.current = Date.now();
    stepEnteredAt.current = Date.now();
  }, [product?.id]);

  // Wall clock for the header timer.
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 500);
    return () => clearInterval(t);
  }, [done]);

  // Frame the product the way this step wants to be seen.
  useEffect(() => {
    if (current?.view) orbit.aim(current.view[0], current.view[1]);
  }, [step, current?.view]);

  const commitStepTime = () => {
    const spent = (Date.now() - stepEnteredAt.current) / 1000;
    recordStep(step, spent);
    stepEnteredAt.current = Date.now();
  };

  const go = (delta: number) => {
    const next = step + delta;
    if (next < 0 || next >= total) return;
    commitStepTime();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(next);
    if (product) setProgress(product.id, next);
  };

  const finish = () => {
    commitStepTime();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const totalSec = (Date.now() - startedAt.current) / 1000;
    finishSession(true, totalSec);
    if (product) clearProgress(product.id);
    setElapsed(totalSec);
    setDone(true);
  };

  // Horizontal swipes on the instruction sheet move between steps; the 3D area
  // above keeps its own pan responder for orbiting.
  const sheetPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -55) go(1);
          else if (g.dx > 55) go(-1);
        },
      }),
    [step, total],
  );

  if (!product || !guide) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space(10) }}>
        <Empty
          icon="construct-outline"
          title="No guide for this product"
          body="Only the three full-tier products have hand-authored steps in this prototype."
        />
        <View style={{ paddingHorizontal: space(6), marginTop: space(4) }}>
          <Button label="Back" variant="secondary" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  // ----------------------------------------------------------------- completion
  if (done) {
    const baselineSec = product.baselineMin * 60;
    const faster = baselineSec - elapsed;
    const pct = Math.round((Math.abs(faster) / baselineSec) * 100);
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ProductScene
          product={product}
          mode="assembled"
          autoRotate
          orbit={orbit.state}
          panHandlers={orbit.panHandlers}
          style={StyleSheet.absoluteFill}
        />
        <View style={[s.doneCard, { paddingBottom: insets.bottom + space(5) }]}>
          <View style={s.doneBadge}>
            <Ionicons name="checkmark" size={28} color={colors.canvas} />
          </View>
          <Text style={[type.title, { color: colors.text, marginTop: space(3) }]}>
            {product.name} assembled
          </Text>
          <Text style={[type.small, { color: colors.textDim, marginTop: space(1), textAlign: 'center' }]}>
            {total} steps · recorded to Study mode
          </Text>

          <Row gap={space(2.5)} style={{ marginTop: space(4) }}>
            <StatTile value={fmtDuration(elapsed)} label="Your time" tone={colors.blue} />
            <StatTile value={`${product.baselineMin}m`} label="Baseline" />
            <StatTile
              value={`${faster >= 0 ? '-' : '+'}${pct}%`}
              label={faster >= 0 ? 'Faster' : 'Slower'}
              tone={faster >= 0 ? colors.success : colors.warn}
            />
          </Row>

          <View style={{ width: '100%', gap: space(2.5), marginTop: space(5) }}>
            <Button label="See the finished model" icon="cube-outline" onPress={() => router.replace(`/viewer/${product.id}`)} />
            <Button label="Done" variant="secondary" onPress={() => router.replace('/')} />
          </View>
        </View>
      </View>
    );
  }

  // ------------------------------------------------------------------ build view
  const hardwareLines = current.hardware.map((l) => ({ line: l, h: HARDWARE[l.id] })).filter((x) => x.h);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ProductScene
        product={product}
        guide={guide}
        mode="step"
        step={step}
        ghostPending={ghost}
        orbit={orbit.state}
        panHandlers={orbit.panHandlers}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + space(1) }]} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.circle}>
          <Ionicons name="close" size={21} color={colors.text} />
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[type.heading, { color: colors.text }]}>{product.name}</Text>
          <Row gap={space(1.5)}>
            <Ionicons name="time-outline" size={12} color={colors.blue} />
            <Text style={[type.mono, { color: colors.blue }]}>{fmtDuration(elapsed)}</Text>
            <Text style={[type.small, { color: colors.textFaint }]}>/ {product.baselineMin}m</Text>
          </Row>
        </View>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setGhost((v) => !v);
          }}
          hitSlop={10}
          style={[s.circle, ghost && { backgroundColor: colors.ink }]}
        >
          <Ionicons name="eye-outline" size={18} color={ghost ? colors.canvas : colors.ink} />
        </Pressable>
      </View>

      {/* Step pips */}
      <View style={[s.pips, { top: insets.top + space(11) }]} pointerEvents="none">
        {steps.map((st, i) => (
          <View
            key={st.id}
            style={[
              s.pip,
              {
                backgroundColor: i < step ? colors.ink : i === step ? colors.accent : colors.border,
                flex: i === step ? 1.6 : 1,
              },
            ]}
          />
        ))}
      </View>

      {/* Instruction sheet */}
      <View style={[s.sheet, { paddingBottom: insets.bottom + space(3) }]} {...sheetPan.panHandlers}>
        <View style={s.grabber} />

        <Row style={{ justifyContent: 'space-between', marginBottom: space(2) }}>
          <Text style={[type.micro, { color: colors.blue }]}>
            STEP {step + 1} OF {total}
          </Text>
          <Row gap={space(1.5)}>
            <Ionicons name="hourglass-outline" size={12} color={colors.textFaint} />
            <Text style={[type.small, { color: colors.textFaint }]}>~{Math.round(current.seconds / 60) || 1} min</Text>
          </Row>
        </Row>

        <Text style={[type.title, { color: colors.text }]}>{current.title}</Text>

        <ScrollView style={{ maxHeight: 188 }} showsVerticalScrollIndicator={false}>
          <Text style={[type.body, { color: colors.textDim, marginTop: space(2), lineHeight: 22 }]}>
            {current.detail}
          </Text>

          {hardwareLines.length > 0 && (
            <View style={s.hwRow}>
              {hardwareLines.map(({ line, h }) => (
                <View key={line.id} style={s.hwChip}>
                  <HardwareGlyph glyph={h!.glyph} size={22} color={colors.ink} />
                  <View>
                    <Text style={[type.small, { color: colors.text }]}>×{line.qty}</Text>
                    <Text style={[type.micro, { color: colors.textFaint }]}>{h!.code}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Row gap={space(2)} style={{ marginTop: space(3), flexWrap: 'wrap' }}>
            {current.tool && <Chip label={current.tool} icon="build-outline" tone="blue" />}
            {current.parts.length > 0 && <Chip label={`${current.parts.length} piece${current.parts.length > 1 ? 's' : ''} this step`} icon="cube-outline" />}
          </Row>

          {current.tip && (
            <View style={[s.note, { backgroundColor: colors.blueDim, borderColor: colors.blue }]}>
              <Ionicons name="bulb-outline" size={15} color={colors.blue} />
              <Text style={[type.small, { color: colors.text, flex: 1, lineHeight: 19 }]}>{current.tip}</Text>
            </View>
          )}

          {current.warning && (
            <View style={[s.note, { backgroundColor: colors.dangerDim, borderColor: colors.danger }]}>
              <Ionicons name="warning-outline" size={15} color={colors.danger} />
              <Text style={[type.small, { color: colors.text, flex: 1, lineHeight: 19 }]}>{current.warning}</Text>
            </View>
          )}
        </ScrollView>

        <View style={{ marginTop: space(3) }}>
          <ProgressBar value={(step + 1) / total} height={4} />
        </View>

        <Row gap={space(2.5)} style={{ marginTop: space(3) }}>
          <Button
            label="Back"
            variant="secondary"
            icon="chevron-back"
            onPress={() => go(-1)}
            disabled={step === 0}
            style={{ flex: 1 }}
          />
          {step === total - 1 ? (
            <Button label="Finish" icon="checkmark" onPress={finish} style={{ flex: 1.5 }} />
          ) : (
            <Button label="Next step" icon="chevron-forward" onPress={() => go(1)} style={{ flex: 1.5 }} />
          )}
        </Row>

        <Text style={[type.small, { color: colors.textFaint, textAlign: 'center', marginTop: space(2) }]}>
          Swipe this card sideways · drag the model above to rotate
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingHorizontal: space(4),
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pips: {
    position: 'absolute',
    left: space(4),
    right: space(4),
    flexDirection: 'row',
    gap: space(1),
  },
  pip: { height: 4, borderRadius: 2 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space(4),
    paddingTop: space(2),
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.hairline,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: space(3),
  },
  hwRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(3) },
  hwChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    paddingHorizontal: space(2.5),
    paddingVertical: space(2),
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  note: {
    flexDirection: 'row',
    gap: space(2.5),
    alignItems: 'flex-start',
    padding: space(3),
    marginTop: space(3),
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  doneCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: space(5),
    paddingTop: space(6),
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  doneBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
