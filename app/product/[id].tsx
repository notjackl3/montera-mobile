import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGuide, guideSeconds } from '@/data/guides';
import { HARDWARE } from '@/data/hardware';
import { getProduct } from '@/data/products';
import { partsFor } from '@/engine/pose';
import { useApp } from '@/store/useApp';
import { Button, Card, Chip, Difficulty, Divider, Empty, Row, SectionHeader, StatTile } from '@/ui/components';
import { HardwareGlyph } from '@/ui/Thumb';
import { ProductScene } from '@/three/ProductScene';
import { useOrbit } from '@/three/useOrbit';
import { colors, radius, space, type } from '@/ui/theme';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const product = getProduct(id);
  const touchProduct = useApp((s) => s.touchProduct);
  const progress = useApp((s) => (id ? s.progress[id] : undefined));
  const orbit = useOrbit({ az: 0.8, pol: 1.08 });

  useEffect(() => {
    if (product) touchProduct(product.id);
  }, [product?.id]);

  const guide = getProduct(id) ? getGuide(id) : undefined;

  const partGroups = useMemo(() => {
    if (!product) return [];
    const groups = new Map<string, { name: string; count: number }>();
    for (const part of partsFor(product)) {
      // "Leg 1".."Leg 4" collapse into a single "Leg ×4" line, the way the
      // real parts list in the manual presents them.
      const key = part.name.replace(/\s+\d+(-\d+)?$/, '').trim();
      const g = groups.get(key);
      if (g) g.count += 1;
      else groups.set(key, { name: key, count: 1 });
    }
    return [...groups.values()];
  }, [product]);

  if (!product) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space(10) }}>
        <Empty icon="alert-circle-outline" title="Product not found" body="That id is not in the seeded catalogue." />
      </View>
    );
  }

  const pieces = partsFor(product).length;
  const guideMin = guide ? Math.round(guideSeconds(guide) / 60) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space(10) }} showsVerticalScrollIndicator={false}>
        {/* Hero viewport */}
        <View style={{ height: 360 }}>
          <ProductScene
            product={product}
            mode="assembled"
            autoRotate
            orbit={orbit.state}
            panHandlers={orbit.panHandlers}
            style={{ flex: 1 }}
          />

          <View style={[s.heroTop, { paddingTop: insets.top + space(1) }]} pointerEvents="box-none">
            <Pressable onPress={() => router.back()} hitSlop={10} style={s.circleBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={orbit.reset} hitSlop={10} style={s.circleBtn}>
              <Ionicons name="refresh" size={18} color={colors.ink} />
            </Pressable>
          </View>

          <View style={s.heroHint} pointerEvents="none">
            <Ionicons name="move-outline" size={13} color={colors.textFaint} />
            <Text style={[type.small, { color: colors.textFaint }]}>Drag to rotate · pinch to zoom</Text>
          </View>
        </View>

        {/* Identity */}
        <View style={{ paddingHorizontal: space(4), marginTop: space(4) }}>
          <Row gap={space(2)}>
            <Text style={[type.display, { color: colors.text }]}>{product.name}</Text>
            <View style={{ flex: 1 }} />
            <Text style={[type.title, { color: colors.ink }]}>£{product.price.toFixed(2)}</Text>
          </Row>
          <Text style={[type.body, { color: colors.textDim, marginTop: space(1) }]}>
            {product.descriptor} · {product.finishName}
          </Text>

          <Row gap={space(2)} style={{ marginTop: space(3), flexWrap: 'wrap' }}>
            <Chip label={product.article} icon="pricetag-outline" tone="blue" />
            <Chip label={`${product.rating.toFixed(1)} (${product.reviews.toLocaleString()})`} icon="star" tone="warn" />
            {product.tier === 'full' ? (
              <Chip label="Step-by-step guide" tone="success" icon="checkmark-circle" />
            ) : (
              <Chip label="3D model only" tone="neutral" icon="cube-outline" />
            )}
          </Row>

          <Text style={[type.body, { color: colors.textDim, marginTop: space(3.5), lineHeight: 22 }]}>
            {product.blurb}
          </Text>
        </View>

        {/* Actions */}
        <View style={{ paddingHorizontal: space(4), marginTop: space(5), gap: space(2.5) }}>
          {product.tier === 'full' ? (
            <Button
              label={progress ? `Resume at step ${progress.step + 1}` : 'Start guided assembly'
              }
              icon={progress ? 'play' : 'construct'}
              onPress={() => router.push(`/build/${product.id}`)}
            />
          ) : (
            <Button label="No guide authored yet" icon="lock-closed-outline" disabled />
          )}
          <Button
            label="Open 3D viewer"
            icon="cube-outline"
            variant="secondary"
            onPress={() => router.push(`/viewer/${product.id}`)}
          />
        </View>

        {/* Specs */}
        <View style={{ paddingHorizontal: space(4), marginTop: space(6) }}>
          <SectionHeader title="At a glance" />
          <Row gap={space(2.5)}>
            <StatTile value={`${product.dims.w}×${product.dims.d}`} label="Footprint cm" />
            <StatTile value={`${product.dims.h}`} label="Height cm" />
            <StatTile value={String(pieces)} label="Pieces" />
          </Row>
          <Row gap={space(2.5)} style={{ marginTop: space(2.5) }}>
            <StatTile value={`${product.baselineMin}m`} label="Typical build" tone={colors.ink} />
            <StatTile value={guideMin ? `${guideMin}m` : '—'} label="Guided est." tone={colors.blue} />
            <StatTile value={product.people === 2 ? 'Two' : 'One'} label="People" />
          </Row>

          <Card style={{ marginTop: space(3) }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={[type.small, { color: colors.textDim }]}>Difficulty</Text>
              <Row gap={space(2)}>
                <Difficulty level={product.difficulty} size={8} />
                <Text style={[type.small, { color: colors.text }]}>{product.difficulty}/5</Text>
              </Row>
            </Row>
            <Divider />
            <Row style={{ justifyContent: 'space-between', marginTop: space(3) }}>
              <Text style={[type.small, { color: colors.textDim }]}>Tools</Text>
              <Text style={[type.small, { color: colors.text, flex: 1, textAlign: 'right' }]}>
                {product.tools.join(' · ')}
              </Text>
            </Row>
            {product.source && (
              <>
                <Divider />
                <Row style={{ justifyContent: 'space-between', marginTop: space(3) }}>
                  <Text style={[type.small, { color: colors.textDim }]}>Timing source</Text>
                  <Text style={[type.small, { color: colors.text }]}>{product.source}</Text>
                </Row>
              </>
            )}
          </Card>
        </View>

        {/* Panels */}
        <View style={{ paddingHorizontal: space(4), marginTop: space(6) }}>
          <SectionHeader title={`Panels and pieces · ${pieces}`} />
          <Card padded={false}>
            {partGroups.map((g, i) => (
              <View key={g.name}>
                {i > 0 && <Divider />}
                <Row style={{ padding: space(3.5) }}>
                  <View style={s.partDot} />
                  <Text style={[type.body, { color: colors.text, flex: 1 }]}>{g.name}</Text>
                  <Text style={[type.mono, { color: colors.textDim }]}>×{g.count}</Text>
                </Row>
              </View>
            ))}
          </Card>
        </View>

        {/* Fittings */}
        <View style={{ paddingHorizontal: space(4), marginTop: space(6) }}>
          <SectionHeader title="Fittings bag" />
          <Card padded={false}>
            {product.hardware.map((line, i) => {
              const h = HARDWARE[line.id];
              if (!h) return null;
              return (
                <View key={line.id}>
                  {i > 0 && <Divider />}
                  <Row style={{ padding: space(3) }} gap={space(3)}>
                    <View style={s.glyphBox}>
                      <HardwareGlyph glyph={h.glyph} size={24} color={colors.ink} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[type.body, { color: colors.text }]}>{h.name}</Text>
                      <Text style={[type.mono, { color: colors.textFaint }]}>{h.code}</Text>
                    </View>
                    <Text style={[type.mono, { color: colors.text }]}>×{line.qty}</Text>
                  </Row>
                </View>
              );
            })}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  heroTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space(4),
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroHint: {
    position: 'absolute',
    bottom: space(3),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
    borderRadius: radius.pill,
    backgroundColor: colors.panelOnCamera,
  },
  partDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.ink,
    marginRight: space(2),
  },
  glyphBox: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
