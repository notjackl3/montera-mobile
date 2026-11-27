import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGuide } from '@/data/guides';
import { webGuideFor } from '@/data/webGuides';
import { HARDWARE } from '@/data/hardware';
import { getProduct } from '@/data/products';
import {
  advanceUndo,
  backOnTrack,
  checksAlert,
  isCritical,
  nextOutcome,
  primaryLabel,
  startUndo,
  undoActionLabel,
  undoBanner,
  undoCaution,
  undoText,
  type UndoState,
} from '@/engine/build';
import { fillLetters, lettersFor } from '@/engine/letters';
import type { VoiceCommand } from '@/engine/voice';
import { ProductScene } from '@/three/ProductScene';
import { useOrbit } from '@/three/useOrbit';
import { fmtDuration, useApp } from '@/store/useApp';
import { Button, Empty, Row, StatTile } from '@/ui/components';
import { LetterBadge } from '@/ui/LetterBadge';
import { PartsBag } from '@/ui/PartsBag';
import { Sheet } from '@/ui/Sheet';
import { HardwareGlyph } from '@/ui/Thumb';
import { StepList, Timeline } from '@/ui/Timeline';
import { useVoiceSim, VoiceBanner, WizardPanel } from '@/ui/Voice';
import { colors, font, radius, space, type } from '@/ui/theme';

/**
 * Products the web app has a guide for are built there (app/guide/[id].tsx);
 * the rest keep this screen's native guide.
 */
export default function BuildRoute() {
  const { id, step } = useLocalSearchParams<{ id: string; step?: string }>();
  const web = webGuideFor(id);
  if (web) return <Redirect href={{ pathname: '/guide/[id]', params: step ? { id: web.id, step } : { id: web.id } }} />;
  return <BuildScreen />;
}

function BuildScreen() {
  useKeepAwake();

  const params = useLocalSearchParams<{ id: string; step?: string }>();
  const id = params.id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const product = getProduct(id);
  const guide = getGuide(id);
  const steps = guide?.steps ?? [];
  const total = steps.length;

  const saved = useApp((st) => (id ? st.progress[id]?.step : undefined));
  const voiceOn = useApp((st) => st.voice.banner);
  const { setProgress, clearProgress, startSession, discardSession, recordStep, finishSession } = useApp();

  // `?step=3` (1-based) is the mid-build entry: scanner "Open step 3" and
  // "Already partway through?". It wins over saved progress.
  const requested = params.step ? Math.min(Math.max(Number(params.step) - 1, 0), Math.max(total - 1, 0)) : undefined;
  const [step, setStep] = useState(requested ?? saved ?? 0);
  const [done, setDone] = useState(false);
  const [ghost, setGhost] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const [ticked, setTicked] = useState<Record<number, boolean[]>>({});
  const [nudged, setNudged] = useState<number | null>(null);

  const [undo, setUndo] = useState<UndoState | undefined>();
  const [undoFrom, setUndoFrom] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const [bag, setBag] = useState<{ open: boolean; focus?: string }>({ open: false });
  const [picker, setPicker] = useState(false);
  const [settings, setSettings] = useState<'closed' | 'menu' | 'confirm'>('closed');
  const [wizard, setWizard] = useState(false);

  const orbit = useOrbit({ az: 0.75, pol: 1.05 });
  const stepEnteredAt = useRef(Date.now());
  const sheetScroll = useRef<ScrollViewInstance>(null);
  const checksY = useRef(0);
  const startedAt = useRef(Date.now());

  const letters = useMemo(() => (product ? lettersFor(product) : {}), [product]);
  const L = (t: string) => fillLetters(t, letters);

  // The step whose parts the 3D shows: in undo mode, the one being taken off.
  const shownStep = undo ? undo.queue[0] : step;
  const current = steps[shownStep];

  useEffect(() => {
    if (!product) return;
    startSession(product.id, 'digital');
    startedAt.current = Date.now();
    stepEnteredAt.current = Date.now();
    if (requested !== undefined) setProgress(product.id, requested);
  }, [product?.id]);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 500);
    return () => clearInterval(t);
  }, [done]);

  useEffect(() => {
    if (current?.view) orbit.aim(current.view[0], current.view[1]);
  }, [shownStep, current?.view]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const commitStepTime = () => {
    recordStep(step, (Date.now() - stepEnteredAt.current) / 1000);
    stepEnteredAt.current = Date.now();
  };

  const jump = (next: number) => {
    if (next < 0 || next >= total || next === step) return;
    commitStepTime();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(next);
    setNudged(null);
    setToast(null);
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

  const nextInput = { step: steps[step], ticked: ticked[step], nudged: nudged === step };

  const primary = () => {
    if (undo) return undoNext();
    if (!steps[step]) return;
    if (nextOutcome(nextInput) === 'hold') {
      // Nothing moves: the checks turn red where they are, the label changes.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setNudged(step);
      // The checks stay where they are; only the sheet scrolls, if they are
      // below its fold, so they cannot be passed unseen.
      sheetScroll.current?.scrollTo({ y: Math.max(0, checksY.current - space(2)), animated: true });
      return;
    }
    if (step === total - 1) finish();
    else jump(step + 1);
  };

  const toggleCheck = (i: number) => {
    Haptics.selectionAsync();
    setTicked((t) => {
      const row = (t[step] ?? []).slice();
      row[i] = !row[i];
      return { ...t, [step]: row };
    });
  };

  // -------------------------------------------------------------------- undo
  const beginUndo = (target: number) => {
    setPicker(false);
    const u = startUndo(step, target);
    if (!u) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    commitStepTime();
    setUndoFrom(step);
    setUndo(u);
    setNudged(null);
    setToast(null);
  };

  const undoNext = () => {
    if (!undo) return;
    const r = advanceUndo(undo);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if ('next' in r) {
      setUndo(r.next);
      return;
    }
    // Everything from the wrong step on has to be redone, so clear its ticks.
    setTicked((t) => Object.fromEntries(Object.entries(t).filter(([k]) => Number(k) < r.done)));
    setUndo(undefined);
    setStep(r.done);
    stepEnteredAt.current = Date.now();
    if (product) setProgress(product.id, r.done);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setToast(backOnTrack(r.done));
  };

  const stopUndo = () => {
    if (!undo) return;
    // The head is still built, so the user is ready to redo the step after it.
    const at = Math.min(undo.queue[0] + 1, undoFrom);
    setUndo(undefined);
    setStep(at);
    if (product) setProgress(product.id, at);
  };

  // ----------------------------------------------------------------- restart
  const restart = () => {
    if (!product) return;
    setSettings('closed');
    clearProgress(product.id);
    discardSession();
    startSession(product.id, 'digital');
    startedAt.current = Date.now();
    stepEnteredAt.current = Date.now();
    setStep(0);
    setTicked({});
    setNudged(null);
    setUndo(undefined);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ------------------------------------------------------------------- voice
  const run = (c: VoiceCommand) => {
    if (c === 'next') primary();
    else if (c === 'back') (undo ? stopUndo() : jump(step - 1));
    else if (c === 'repeat') {
      if (current?.view) orbit.aim(current.view[0] + 0.0001, current.view[1]);
    } else if (c === 'undo') setPicker(true);
    else if (c === 'parts') setBag({ open: true });
  };
  const voice = useVoiceSim(step, run);

  // Horizontal swipes on the instruction sheet move between steps.
  const sheetPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => !undo && Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -55) primary();
          else if (g.dx > 55) jump(step - 1);
        },
      }),
    [step, total, undo, nudged, ticked],
  );

  if (!product || !guide) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space(10) }}>
        <Empty icon="construct-outline" title="No guide for this product" body="Only the guided products have steps in this prototype." />
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
        <ProductScene product={product} mode="assembled" autoRotate orbit={orbit.state} panHandlers={orbit.panHandlers} style={StyleSheet.absoluteFill} />
        <View style={[s.doneCard, { paddingBottom: insets.bottom + space(5) }]}>
          <View style={s.doneBadge}>
            <Ionicons name="checkmark" size={28} color={colors.canvas} />
          </View>
          <Text style={[type.title, { color: colors.text, marginTop: space(3) }]}>{product.name} assembled</Text>
          <Text style={[type.body, { color: colors.textDim, marginTop: space(1), textAlign: 'center' }]}>
            {total} steps · recorded to Study mode
          </Text>
          <Row gap={space(2.5)} style={{ marginTop: space(4) }}>
            <StatTile value={fmtDuration(elapsed)} label="Your time" tone={colors.blue} />
            <StatTile value={`${product.baselineMin}m`} label={product.baselineEstimated ? 'Estimate' : 'Baseline'} />
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
  const alert = !undo && checksAlert(nextInput);
  const caution = undo ? undoCaution(current) : undefined;
  const hardwareLines = current.hardware.map((l) => ({ line: l, h: HARDWARE[l.id] })).filter((x) => x.h);
  const checks = current.checks ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Top: header, voice or undo banner, timeline */}
      <View style={[s.top, { paddingTop: insets.top + space(1) }]}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={6} style={s.circle} accessibilityLabel="Close. Your place is saved">
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[type.heading, { color: colors.text }]}>{product.name}</Text>
            <Row gap={space(1.5)}>
              <Text style={[type.mono, { color: colors.blue }]}>{fmtDuration(elapsed)}</Text>
              <Text style={[type.small, { color: colors.textFaint }]}>
                / {product.baselineMin}m{product.baselineEstimated ? ' est.' : ''}
              </Text>
            </Row>
          </View>
          <Pressable onPress={() => setSettings('menu')} hitSlop={6} style={s.circle} accessibilityLabel="Build settings">
            <Ionicons name="settings-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        {undo ? (
          <View style={s.undoBanner} accessibilityLiveRegion="polite">
            <Ionicons name="arrow-undo" size={20} color={colors.onDark} />
            <Text style={[type.heading, { color: colors.onDark, flex: 1 }]}>{undoBanner(undo)}</Text>
          </View>
        ) : toast ? (
          <View style={s.toast} accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle" size={20} color={colors.onDark} />
            <Text style={[type.heading, { color: colors.onDark, flex: 1 }]}>{toast}</Text>
          </View>
        ) : voiceOn ? (
          <VoiceBanner state={voice.state} onLongPress={() => setWizard(true)} />
        ) : null}

        <Timeline
          steps={steps}
          current={step}
          onJump={undo ? undefined : jump}
          undo={undo ? { from: undoFrom, to: undo.target, at: undo.queue[0] } : undefined}
        />
      </View>

      {/* 3D, between the top block and the sheet so it frames centred. */}
      <ProductScene
        product={product}
        guide={guide}
        mode="step"
        step={shownStep}
        ghostPending={ghost}
        orbit={orbit.state}
        panHandlers={orbit.panHandlers}
        style={{ flex: 1 }}
      />

      {/* Instruction sheet */}
      <View
        style={[s.sheet, undo && { borderTopColor: colors.ink, borderTopWidth: 3 }, { paddingBottom: insets.bottom + space(3) }]}
        {...sheetPan.panHandlers}
      >
        <Row style={{ justifyContent: 'space-between', marginBottom: space(1) }}>
          <Text style={[type.micro, { color: undo ? colors.ink : colors.blue }]}>
            {undo ? `TAKE APART · STEP ${shownStep + 1}` : `STEP ${step + 1} OF ${total}`}
          </Text>
          {!undo && isCritical(current) && (
            <Row gap={space(1.5)}>
              <View style={s.markerDot} />
              <Text style={[type.micro, { color: colors.ink }]}>WATCH OUT</Text>
            </Row>
          )}
        </Row>

        <Text style={[type.title, { color: colors.text }]}>{undo ? `Undo: ${current.title}` : current.title}</Text>

        <ScrollView ref={sheetScroll} key={`sheet-${shownStep}-${!!undo}`} style={{ maxHeight: height * 0.28 }} showsVerticalScrollIndicator={false}>
          <Text style={[s.instruction, { color: colors.text }]}>{undo ? undoText(product, current) : L(current.detail)}</Text>

          {(undo ? caution : current.warning) && (
            <View style={s.warning} accessibilityRole="alert">
              <Ionicons name="warning" size={20} color={colors.ink} />
              <Text style={[type.heading, { color: colors.ink, flex: 1 }]}>{undo ? caution : L(current.warning!)}</Text>
            </View>
          )}

          {!undo && checks.length > 0 && (
            <View style={{ marginTop: space(3) }} onLayout={(e) => (checksY.current = e.nativeEvent.layout.y)}>
              <Text style={[type.heading, { color: alert ? colors.danger : colors.text }]} accessibilityRole={alert ? 'alert' : undefined}>
                {alert ? 'Check these first' : 'Done when'}
              </Text>
              {checks.map((c, i) => {
                const on = !!ticked[step]?.[i];
                return (
                  <Pressable
                    key={i}
                    onPress={() => toggleCheck(i)}
                    style={[s.check, alert && !on && { backgroundColor: colors.dangerDim }]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                  >
                    <View style={[s.box, on ? { backgroundColor: colors.blue, borderColor: colors.blue } : alert ? { borderColor: colors.danger } : null]}>
                      {on && <Ionicons name="checkmark" size={18} color={colors.onDark} />}
                    </View>
                    <Text style={[type.body, { color: colors.text, flex: 1 }]}>{L(c)}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {!undo && (hardwareLines.length > 0 || current.tool) && (
            <View style={s.hwRow}>
              {hardwareLines.map(({ line, h }) => (
                <Pressable
                  key={line.id}
                  onPress={() => setBag({ open: true, focus: line.id })}
                  style={({ pressed }) => [s.hwChip, pressed && { backgroundColor: colors.surfacePressed }]}
                  accessibilityLabel={`${line.qty} of part ${letters[line.id]}, ${h!.short ?? h!.name}`}
                >
                  {letters[line.id] && <LetterBadge letter={letters[line.id]} size={28} />}
                  <HardwareGlyph glyph={h!.glyph} size={22} color={colors.ink} />
                  <Text style={[type.heading, { color: colors.text }]}>×{line.qty}</Text>
                </Pressable>
              ))}
              {current.tool && (
                <View style={s.hwChip}>
                  <Ionicons name="build-outline" size={18} color={colors.ink} />
                  <Text style={[type.body, { color: colors.text }]}>{current.tool}</Text>
                </View>
              )}
            </View>
          )}

          {!undo && current.tip && (
            <View style={s.tip}>
              <Ionicons name="bulb-outline" size={18} color={colors.blue} />
              <Text style={[type.body, { color: colors.text, flex: 1 }]}>{L(current.tip)}</Text>
            </View>
          )}
        </ScrollView>

        {/* Secondary row: always there from step 1 */}
        <Row gap={space(2.5)} style={{ marginTop: space(3) }}>
          <Button label="Parts" icon="bag-handle-outline" variant="secondary" onPress={() => setBag({ open: true })} style={{ flex: 1, paddingHorizontal: space(3) }} />
          {undo ? (
            <Button label="Stop undoing" variant="secondary" onPress={stopUndo} style={{ flex: 1.6, paddingHorizontal: space(3) }} />
          ) : (
            <Button label="Something’s wrong" variant="secondary" onPress={() => setPicker(true)} style={{ flex: 1.6, paddingHorizontal: space(3) }} />
          )}
        </Row>

        {/* Action bar: full-width primary, smaller Back beside it */}
        <Row gap={space(2.5)} style={{ marginTop: space(2.5) }}>
          {!undo && (
            <Pressable
              onPress={() => jump(step - 1)}
              disabled={step === 0}
              style={({ pressed }) => [s.backBtn, step === 0 && { opacity: 0.35 }, pressed && { backgroundColor: colors.surfacePressed }]}
              accessibilityLabel="Previous step"
            >
              <Ionicons name="chevron-back" size={24} color={colors.ink} />
            </Pressable>
          )}
          <Pressable
            onPress={primary}
            style={({ pressed }) => [
              s.primary,
              undo ? { backgroundColor: colors.ink, borderColor: colors.ink } : alert ? { backgroundColor: colors.canvas, borderColor: colors.ink } : null,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
          >
            {undo ? <Ionicons name="arrow-undo" size={20} color={colors.onDark} /> : null}
            <Text style={[type.heading, { color: alert ? colors.ink : colors.onDark, textAlign: 'center' }]} numberOfLines={2}>
              {undo ? undoActionLabel(undo.queue[0]) : primaryLabel({ ...nextInput, last: step === total - 1 })}
            </Text>
            {!undo && !alert && <Ionicons name={step === total - 1 ? 'checkmark' : 'chevron-forward'} size={20} color={colors.onDark} />}
          </Pressable>
        </Row>
      </View>

      {/* Sheets */}
      <PartsBag
        key={`${bag.focus ?? 'list'}-${bag.open}`}
        product={product}
        step={current}
        focus={bag.focus}
        visible={bag.open}
        onClose={() => setBag({ open: false })}
      />

      <Sheet visible={picker} onClose={() => setPicker(false)} title="Which step went wrong?">
        <Text style={[type.body, { color: colors.textDim, marginBottom: space(2) }]}>
          We will take it apart back to that step, one step at a time.
        </Text>
        <ScrollView style={{ flexGrow: 0 }}>
          <StepList steps={steps} current={step} selectableUpTo={step} onPick={beginUndo} />
        </ScrollView>
      </Sheet>

      <Sheet
        visible={settings !== 'closed'}
        onClose={() => setSettings('closed')}
        onBack={settings === 'confirm' ? () => setSettings('menu') : undefined}
        title={settings === 'confirm' ? 'Restart this build?' : 'Build settings'}
      >
        {settings === 'menu' ? (
          <View>
            <SettingRow
              icon="eye-outline"
              label="Show parts not fitted yet"
              value={ghost ? 'On' : 'Off'}
              onPress={() => {
                Haptics.selectionAsync();
                setGhost((v) => !v);
              }}
            />
            <SettingRow
              icon="mic-outline"
              label="Voice wizard (facilitator)"
              onPress={() => {
                setSettings('closed');
                setTimeout(() => setWizard(true), 300);
              }}
            />
            <SettingRow icon="refresh" label="Restart this build" onPress={() => setSettings('confirm')} />
          </View>
        ) : (
          <View style={{ gap: space(3) }}>
            <Text style={[type.body, { color: colors.text }]}>
              You are on step {step + 1} of {total}. Restarting loses your place.
            </Text>
            {/* Restart first, so the safe choice sits where the menu row was:
                a double tap lands on "Keep my place", never on Restart. */}
            <Button label="Restart from step 1" variant="secondary" icon="refresh" onPress={restart} />
            <Button label="Keep my place" onPress={() => setSettings('closed')} />
          </View>
        )}
      </Sheet>

      <WizardPanel visible={wizard} onClose={() => setWizard(false)} stepCount={total} fire={voice.fire} fail={voice.fail} />
    </View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.setting, pressed && { backgroundColor: colors.surfacePressed }]}>
      <Ionicons name={icon} size={22} color={colors.ink} />
      <Text style={[type.heading, { color: colors.text, flex: 1 }]}>{label}</Text>
      {value && <Text style={[type.body, { color: colors.textDim }]}>{value}</Text>}
      <Ionicons name="chevron-forward" size={20} color={colors.ink} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  top: {
    paddingHorizontal: space(4),
    paddingBottom: space(2),
    gap: space(2),
    backgroundColor: colors.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  circle: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
    minHeight: 52,
    paddingHorizontal: space(3),
    backgroundColor: colors.ink,
    borderRadius: radius.md,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
    minHeight: 52,
    paddingHorizontal: space(3),
    backgroundColor: colors.blue,
    borderRadius: radius.md,
  },
  sheet: {
    paddingHorizontal: space(4),
    paddingTop: space(3),
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  instruction: { fontFamily: font.regular, fontSize: 18, lineHeight: 26, marginTop: space(1.5) },
  markerDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.ink },
  warning: {
    flexDirection: 'row',
    gap: space(2.5),
    alignItems: 'flex-start',
    padding: space(3),
    marginTop: space(3),
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    minHeight: 52,
    paddingHorizontal: space(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  box: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hwRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(3) },
  hwChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    minHeight: 48,
    paddingHorizontal: space(2.5),
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tip: {
    flexDirection: 'row',
    gap: space(2.5),
    alignItems: 'flex-start',
    padding: space(3),
    marginTop: space(3),
    borderRadius: radius.md,
    backgroundColor: colors.blueDim,
  },
  backBtn: {
    width: 64,
    height: 56,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
    paddingHorizontal: space(4),
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    minHeight: 60,
    paddingHorizontal: space(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
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
