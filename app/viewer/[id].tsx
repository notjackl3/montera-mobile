import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGuide } from '@/data/guides';
import { getProduct } from '@/data/products';
import { partsFor } from '@/engine/pose';
import { ProductScene } from '@/three/ProductScene';
import { useOrbit } from '@/three/useOrbit';
import { Chip, Empty, Row } from '@/ui/components';
import { colors, radius, space, type } from '@/ui/theme';

type ViewTab = 'solid' | 'exploded' | 'parts' | 'dims';

const TABS: { key: ViewTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'solid', label: 'Solid', icon: 'cube' },
  { key: 'exploded', label: 'Exploded', icon: 'git-network-outline' },
  { key: 'parts', label: 'Parts', icon: 'list-outline' },
  { key: 'dims', label: 'Size', icon: 'resize-outline' },
];

export default function Viewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const product = getProduct(id);

  const [tab, setTab] = useState<ViewTab>('solid');
  const [spread, setSpread] = useState(0.6);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isolated, setIsolated] = useState<string | null>(null);
  const orbit = useOrbit({ az: 0.8, pol: 1.05 });

  if (!product) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space(10) }}>
        <Empty icon="alert-circle-outline" title="Product not found" body="That id is not in the seeded catalogue." />
      </View>
    );
  }

  const parts = partsFor(product);
  const guide = getGuide(product.id);

  const pick = (next: ViewTab) => {
    Haptics.selectionAsync();
    setTab(next);
    if (next !== 'parts') setIsolated(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ProductScene
        product={product}
        guide={guide}
        mode={tab === 'exploded' ? 'exploded' : 'assembled'}
        spread={spread}
        showCage={tab === 'dims'}
        isolatePartId={tab === 'parts' ? isolated : null}
        autoRotate={autoRotate}
        orbit={orbit.state}
        panHandlers={orbit.panHandlers}
        style={StyleSheet.absoluteFill}
      />

      {/* Top chrome */}
      <View style={[s.top, { paddingTop: insets.top + space(1) }]} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.circle}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[type.heading, { color: colors.text }]}>{product.name}</Text>
          <Text style={[type.small, { color: colors.textFaint }]}>{product.descriptor}</Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setAutoRotate((v) => !v);
          }}
          hitSlop={10}
          style={[s.circle, autoRotate && { backgroundColor: colors.ink }]}
        >
          <Ionicons name="sync" size={18} color={autoRotate ? colors.canvas : colors.ink} />
        </Pressable>
      </View>

      {/* Mode-specific panel */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + space(3) }]} pointerEvents="box-none">
        {tab === 'exploded' && (
          <View style={s.panel}>
            <Row style={{ justifyContent: 'space-between', marginBottom: space(2) }}>
              <Text style={[type.small, { color: colors.textDim }]}>Separation</Text>
              <Text style={[type.mono, { color: colors.blue }]}>{Math.round(spread * 100)}%</Text>
            </Row>
            {/* Tap-along track, rather than a slider dependency. */}
            <View style={s.sliderRow}>
              {Array.from({ length: 11 }, (_, i) => i / 10).map((v) => (
                <Pressable
                  key={v}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSpread(v);
                  }}
                  style={[s.tick, { backgroundColor: v <= spread ? colors.ink : colors.border }]}
                />
              ))}
            </View>
            <Text style={[type.small, { color: colors.textFaint, marginTop: space(2) }]}>
              Every panel pushed out along the direction it is fitted from.
            </Text>
          </View>
        )}

        {tab === 'parts' && (
          <View style={s.panel}>
            <Text style={[type.small, { color: colors.textDim, marginBottom: space(2) }]}>
              {isolated
                ? parts.find((p) => p.id === isolated)?.name
                : `Tap a piece to isolate it · ${parts.length} total`}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
              {parts.map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  active={isolated === p.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setIsolated(isolated === p.id ? null : p.id);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {tab === 'dims' && (
          <View style={s.panel}>
            <Row gap={space(3)}>
              {([
                ['Width', product.dims.w],
                ['Depth', product.dims.d],
                ['Height', product.dims.h],
              ] as const).map(([label, v]) => (
                <View key={label} style={{ flex: 1 }}>
                  <Text style={[type.title, { color: colors.blue }]}>{v}</Text>
                  <Text style={[type.micro, { color: colors.textFaint }]}>{label.toUpperCase()} CM</Text>
                </View>
              ))}
            </Row>
            <Text style={[type.small, { color: colors.textFaint, marginTop: space(2) }]}>
              Cage shows the full footprint including any overhang.
            </Text>
          </View>
        )}

        {/* Mode switcher */}
        <View style={s.tabBar}>
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => pick(t.key)}
              style={[s.tabBtn, tab === t.key && { backgroundColor: colors.ink }]}
            >
              <Ionicons name={t.icon} size={17} color={tab === t.key ? colors.canvas : colors.textDim} />
              <Text style={[type.micro, { color: tab === t.key ? colors.canvas : colors.textDim }]}>
                {t.label.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <Row gap={space(2)} style={{ justifyContent: 'center', marginTop: space(2.5) }}>
          <Chip label="Reset view" icon="refresh" onPress={orbit.reset} />
          {product.tier === 'full' && (
            <Chip label="Build it" icon="construct-outline" tone="success" onPress={() => router.push(`/build/${product.id}`)} />
          )}
        </Row>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  top: {
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space(4) },
  panel: {
    backgroundColor: colors.panelOnCamera,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space(4),
    marginBottom: space(2.5),
  },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
  tick: { flex: 1, height: 22, borderRadius: 3 },
  tabBar: {
    flexDirection: 'row',
    gap: space(1),
    padding: space(1),
    backgroundColor: colors.panelOnCamera,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    gap: space(0.5),
    paddingVertical: space(2.5),
    borderRadius: radius.sm,
  },
});
