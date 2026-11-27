import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGuide } from '@/data/guides';
import { HARDWARE } from '@/data/hardware';
import { BY_ID } from '@/data/products';
import {
  DEMO_TARGETS,
  MODES,
  fromBarcode,
  simulate,
  type ScanMode,
  type ScanResult,
} from '@/engine/scanners';
import { fillLetters, lettersFor } from '@/engine/letters';
import { Button, Chip, ProgressBar, Row } from '@/ui/components';
import { LetterBadge } from '@/ui/LetterBadge';
import { HardwareGlyph, Thumb } from '@/ui/Thumb';
import { colors, radius, space, type } from '@/ui/theme';

export default function Scanner() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const scanMode = (MODES[mode as ScanMode] ? (mode as ScanMode) : 'article') satisfies ScanMode;
  const cfg = MODES[scanMode];

  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [targetIdx, setTargetIdx] = useState(0);
  const [scanning, setScanning] = useState(true);

  const target = DEMO_TARGETS[targetIdx % DEMO_TARGETS.length];
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const settled = useRef(false);

  // Reticle animations.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    breathe.start();
    return () => {
      loop.stop();
      breathe.stop();
    };
  }, []);

  const settle = (r: ScanResult) => {
    if (settled.current) return;
    settled.current = true;
    setScanning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setResult(r);
  };

  // Simulated detection on a dwell timer. A real barcode read beats it.
  useEffect(() => {
    if (!scanning) return;
    settled.current = false;
    const t = setTimeout(() => settle(simulate(scanMode, target)), cfg.dwellMs);
    return () => clearTimeout(t);
  }, [scanning, scanMode, target]);

  const rescan = () => {
    settled.current = false;
    setResult(null);
    setScanning(true);
  };

  const granted = permission?.granted === true;

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      {granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'qr'] }}
          onBarcodeScanned={
            scanMode === 'article' && scanning
              ? ({ data }) => {
                  const hit = fromBarcode(data);
                  if (hit) settle(hit);
                }
              : undefined
          }
        />
      ) : (
        <MockViewfinder />
      )}

      {/* Dim the camera outside the reticle so the frame reads clearly. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} pointerEvents="none" />

      {/* Top bar */}
      <View style={[s.top, { paddingTop: insets.top + space(1) }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.circle}>
          <Ionicons name="close" size={21} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[type.heading, { color: colors.canvas }]}>{cfg.title}</Text>
          <Chip label={cfg.live ? 'Live decode' : 'Simulated'} tone={cfg.live ? 'success' : 'warn'} />
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Reticle */}
      {!result && (
        <View style={s.reticleWrap} pointerEvents="none">
          <Reticle shape={cfg.reticle} sweep={sweep} pulse={pulse} />
          <Text style={[type.body, { color: colors.canvas, textAlign: 'center', marginTop: space(5) }]}>
            {cfg.instruction}
          </Text>
          <Row gap={space(2)} style={{ marginTop: space(3), justifyContent: 'center' }}>
            <Animated.View style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }}>
              <Ionicons name="radio-button-on" size={12} color={colors.canvas} />
            </Animated.View>
            <Text style={[type.small, { color: colors.canvas }]}>Scanning…</Text>
          </Row>
        </View>
      )}

      {/* Permission prompt */}
      {!granted && !result && (
        <View style={[s.permission, { bottom: insets.bottom + 220 }]}>
          <Text style={[type.small, { color: colors.textDim, textAlign: 'center', marginBottom: space(3) }]}>
            {permission === null
              ? 'Checking camera access…'
              : 'Camera access is off, so the viewfinder below is simulated. The scan still resolves.'}
          </Text>
          <Button label="Enable camera" icon="camera-outline" variant="secondary" onPress={requestPermission} />
        </View>
      )}

      {/* Demo target picker — keeps a stage demo deterministic. */}
      {!result && (
        <View style={[s.demoBar, { bottom: insets.bottom + space(4) }]}>
          <Text style={[type.micro, { color: colors.textFaint, marginBottom: space(2) }]}>
            DEMO WILL RESOLVE TO
          </Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setTargetIdx((i) => i + 1);
              rescan();
            }}
            style={s.demoChip}
          >
            <Thumb product={BY_ID[target]} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { color: colors.text }]}>
                {BY_ID[target].name} {BY_ID[target].descriptor}
              </Text>
              <Text style={[type.small, { color: colors.textFaint }]}>Tap to cycle target</Text>
            </View>
            <Ionicons name="swap-horizontal" size={18} color={colors.blue} />
          </Pressable>
        </View>
      )}

      {result && (
        <ResultSheet result={result} onRescan={rescan} onClose={() => router.back()} bottomInset={insets.bottom} />
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ viewfinder */

/** Stand-in for the camera feed when permission is unavailable. */
function MockViewfinder() {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 5200, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 5200, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#D9D6CE', overflow: 'hidden' }]}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transform: [
            { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }) },
            { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [10, -10] }) },
          ],
        }}
      >
        {/* Suggestion of a room: a floor line and a cardboard-coloured slab. */}
        <View style={{ position: 'absolute', left: -40, right: -40, top: '58%', height: 1, backgroundColor: '#B3AFA4' }} />
        <View
          style={{
            position: 'absolute',
            left: '18%',
            top: '38%',
            width: '64%',
            height: '30%',
            backgroundColor: '#C2B394',
            borderRadius: 6,
            transform: [{ perspective: 600 }, { rotateX: '12deg' }],
          }}
        />
        <View style={{ position: 'absolute', left: '26%', top: '47%', width: '30%', height: 10, backgroundColor: '#A8977A', borderRadius: 2 }} />
      </Animated.View>
    </View>
  );
}

type Corner = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  bt: number;
  bb: number;
  bl: number;
  br: number;
};

/** The four L-shaped brackets that frame the scan area. */
const CORNERS: Corner[] = [
  { top: 0, left: 0, bt: 3, bb: 0, bl: 3, br: 0 },
  { top: 0, right: 0, bt: 3, bb: 0, bl: 0, br: 3 },
  { bottom: 0, left: 0, bt: 0, bb: 3, bl: 3, br: 0 },
  { bottom: 0, right: 0, bt: 0, bb: 3, bl: 0, br: 3 },
];

function Reticle({
  shape,
  sweep,
  pulse,
}: {
  shape: 'barcode' | 'box' | 'page' | 'scatter';
  sweep: Animated.Value;
  pulse: Animated.Value;
}) {
  const size = shape === 'barcode' ? { w: 290, h: 128 } : shape === 'page' ? { w: 250, h: 320 } : { w: 268, h: 268 };

  return (
    <View style={{ width: size.w, height: size.h }}>
      {/* Corner brackets */}
      {CORNERS.map((c, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: 34,
            height: 34,
            top: c.top,
            bottom: c.bottom,
            left: c.left,
            right: c.right,
            borderColor: colors.blue,
            borderTopWidth: c.bt,
            borderBottomWidth: c.bb,
            borderLeftWidth: c.bl,
            borderRightWidth: c.br,
            borderTopLeftRadius: c.bt && c.bl ? 10 : 0,
            borderTopRightRadius: c.bt && c.br ? 10 : 0,
            borderBottomLeftRadius: c.bb && c.bl ? 10 : 0,
            borderBottomRightRadius: c.bb && c.br ? 10 : 0,
          }}
        />
      ))}

      {/* Sweeping read line */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          height: 2,
          backgroundColor: colors.blue,
          transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [10, size.h - 12] }) }],
        }}
      />

      {/* Mode-specific hint inside the frame */}
      {shape === 'barcode' && (
        <View style={s.barcodeHint}>
          {[3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1].map((w, i) => (
            <View key={i} style={{ width: w, height: 42, backgroundColor: 'rgba(255,254,251,0.55)' }} />
          ))}
        </View>
      )}

      {shape === 'page' && (
        <View style={s.pageHint}>
          {[0.5, 0.8, 0.65].map((w, i) => (
            <View key={i} style={{ width: `${w * 100}%`, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,254,251,0.45)' }} />
          ))}
        </View>
      )}

      {shape === 'scatter' && (
        <Animated.View style={[s.scatterHint, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] }) }]}>
          {['screw', 'dowel', 'camlock', 'hexkey'].map((g) => (
            <HardwareGlyph key={g} glyph={g} size={30} color="rgba(255,254,251,0.8)" />
          ))}
        </Animated.View>
      )}
    </View>
  );
}

/* ---------------------------------------------------------------- result sheet */

function ResultSheet({
  result,
  onRescan,
  onClose,
  bottomInset,
}: {
  result: ScanResult;
  onRescan: () => void;
  onClose: () => void;
  bottomInset: number;
}) {
  const router = useRouter();
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(rise, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 160 }).start();
  }, []);

  const product = BY_ID[result.productId];
  const letters = lettersFor(product);
  const guide = getGuide(product.id);

  return (
    <Animated.View
      style={[
        s.sheet,
        {
          paddingBottom: bottomInset + space(4),
          transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }],
        },
      ]}
    >
      <View style={s.grabber} />

      <Row gap={space(2)} style={{ marginBottom: space(3) }}>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <Text style={[type.micro, { color: colors.success }]}>
          {result.kind === 'hardware' ? 'HARDWARE IDENTIFIED' : result.kind === 'step' ? 'STEP MATCHED' : 'PRODUCT IDENTIFIED'}
        </Text>
      </Row>

      {/* Product / step header */}
      <Row gap={space(3)}>
        <View style={s.resultThumb}>
          <Thumb product={product} size={56} />
        </View>
        <View style={{ flex: 1, gap: space(1) }}>
          <Text style={[type.title, { color: colors.text }]}>{product.name}</Text>
          <Text style={[type.small, { color: colors.textDim }]}>{product.descriptor}</Text>
          {result.kind === 'product' && result.code && (
            <Text style={[type.mono, { color: colors.blue }]}>{result.code}</Text>
          )}
        </View>
      </Row>

      {result.kind !== 'hardware' && (
        <View style={{ marginTop: space(3.5) }}>
          <Row style={{ justifyContent: 'space-between', marginBottom: space(1.5) }}>
            <Text style={[type.small, { color: colors.textDim }]}>Confidence</Text>
            <Text style={[type.mono, { color: colors.success }]}>{Math.round(result.confidence * 100)}%</Text>
          </Row>
          <ProgressBar value={result.confidence} tone={colors.success} height={5} />
        </View>
      )}

      <ScrollView style={{ maxHeight: 210, marginTop: space(3) }} showsVerticalScrollIndicator={false}>
        {/* Matched manual step */}
        {result.kind === 'step' && (
          <View style={s.stepBox}>
            <Text style={[type.micro, { color: colors.blue }]}>
              STEP {result.stepIndex + 1} OF {getGuide(product.id)?.steps.length ?? '?'}
            </Text>
            <Text style={[type.heading, { color: colors.text, marginTop: space(1.5) }]}>
              {getGuide(product.id)?.steps[result.stepIndex]?.title}
            </Text>
            <Text style={[type.body, { color: colors.textDim, marginTop: space(1.5), lineHeight: 22 }]}>
              {fillLetters(guide?.steps[result.stepIndex]?.detail ?? '', letters)}
            </Text>
          </View>
        )}

        {/* Detected fittings */}
        {result.kind === 'hardware' &&
          result.items.map(({ hardwareId, qty, confidence }) => {
            const h = HARDWARE[hardwareId];
            if (!h) return null;
            return (
              <Row key={hardwareId} gap={space(3)} style={s.hwLine}>
                {letters[hardwareId] && <LetterBadge letter={letters[hardwareId]} size={36} />}
                <View style={s.glyphBox}>
                  <HardwareGlyph glyph={h.glyph} size={24} color={colors.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { color: colors.text }]}>{h.short ?? h.name}</Text>
                  <Text style={[type.small, { color: colors.textFaint }]}>
                    {h.lengthMm ? `${h.lengthMm} mm · ` : ''}
                    {Math.round(confidence * 100)}% sure
                  </Text>
                </View>
                <Text style={[type.title, { color: colors.blue }]}>×{qty}</Text>
              </Row>
            );
          })}

        {result.kind === 'hardware' && result.neededStep !== undefined && (
          <View style={[s.stepBox, { marginTop: space(2) }]}>
            <Text style={[type.micro, { color: colors.blue }]}>NEEDED AT STEP {result.neededStep + 1}</Text>
            <Text style={[type.small, { color: colors.text, marginTop: space(1.5) }]}>
              {getGuide(product.id)?.steps[result.neededStep]?.title}
            </Text>
          </View>
        )}

        {/* Runner-up matches */}
        {result.kind === 'product' && result.alternatives.length > 0 && (
          <View style={{ marginTop: space(2) }}>
            <Text style={[type.micro, { color: colors.textFaint, marginBottom: space(2) }]}>NOT IT? OTHER MATCHES</Text>
            {result.alternatives.map((alt) => {
              const p = BY_ID[alt.productId];
              if (!p) return null;
              return (
                <Pressable
                  key={alt.productId}
                  onPress={() => router.replace(`/product/${alt.productId}`)}
                  style={({ pressed }) => [s.altRow, pressed && { opacity: 0.7 }]}
                >
                  <Thumb product={p} size={34} />
                  <Text style={[type.small, { color: colors.text, flex: 1 }]}>
                    {p.name} {p.descriptor}
                  </Text>
                  <Text style={[type.mono, { color: colors.textFaint }]}>{Math.round(alt.confidence * 100)}%</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* One obvious next action, then a quiet way out. */}
      <View style={{ gap: space(1), marginTop: space(3.5) }}>
        {result.kind === 'step' ? (
          <Button
            label={`Open step ${result.stepIndex + 1}`}
            icon="cube"
            onPress={() => router.replace(`/build/${product.id}?step=${result.stepIndex + 1}`)}
          />
        ) : result.kind === 'hardware' ? (
          <Button
            label="Open the parts bag"
            icon="bag-handle-outline"
            onPress={() => router.replace(`/parts/${product.id}?focus=${result.items[0]?.hardwareId ?? ''}`)}
          />
        ) : guide ? (
          <Button label={`Start building ${product.name}`} icon="construct" onPress={() => router.replace(`/build/${product.id}`)} />
        ) : (
          <Button label={`Open ${product.name} in 3D`} icon="cube-outline" onPress={() => router.replace(`/viewer/${product.id}`)} />
        )}

        <Row style={{ justifyContent: 'center', gap: space(6) }}>
          <Pressable onPress={onRescan} hitSlop={6} style={s.textLink}>
            <Text style={[type.body, { color: colors.blue, textDecorationLine: 'underline' }]}>Scan again</Text>
          </Pressable>
          <Pressable onPress={onClose} hitSlop={6} style={s.textLink}>
            <Text style={[type.body, { color: colors.blue, textDecorationLine: 'underline' }]}>Close</Text>
          </Pressable>
        </Row>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
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
  reticleWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 120,
  },
  barcodeHint: {
    position: 'absolute',
    top: 42,
    left: 28,
    right: 28,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
  },
  pageHint: { position: 'absolute', top: 46, left: 34, right: 34, gap: 14 },
  scatterHint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 34,
  },
  permission: { position: 'absolute', left: space(6), right: space(6) },
  demoBar: { position: 'absolute', left: space(4), right: space(4) },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    padding: space(3),
    backgroundColor: colors.panelOnCamera,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.ink,
  },
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
  resultThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBox: {
    padding: space(3.5),
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  hwLine: {
    paddingVertical: space(2.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  glyphBox: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textLink: { minHeight: 48, justifyContent: 'center' },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
    paddingVertical: space(2),
  },
});
