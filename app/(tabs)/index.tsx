import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGuide } from '@/data/guides';
import { BY_ID, PRODUCTS } from '@/data/products';
import { MODE_ORDER, MODES } from '@/engine/scanners';
import { useApp } from '@/store/useApp';
import { Card, Chip, ProgressBar, Row, SectionHeader, StatTile } from '@/ui/components';
import { ProductCard } from '@/ui/ProductRow';
import { Thumb } from '@/ui/Thumb';
import { colors, radius, space, type } from '@/ui/theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { progress, recents } = useApp();

  const guided = PRODUCTS.filter((p) => p.tier === 'full');
  const inProgress = Object.entries(progress)
    .map(([id, p]) => ({ product: BY_ID[id], ...p }))
    .filter((x) => x.product)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const totalSteps = guided.reduce((n, p) => n + (getGuide(p.id)?.steps.length ?? 0), 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space(3), paddingBottom: space(8) }}
      showsVerticalScrollIndicator={false}
    >
      {/* Wordmark */}
      <View style={{ paddingHorizontal: space(4), marginBottom: space(5) }}>
        <Row>
          <View style={s.mark}>
            <Ionicons name="cube" size={18} color={colors.canvas} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.display, { color: colors.text }]}>MONTERA</Text>
            <Text style={[type.small, { color: colors.textFaint }]}>
              See the step before you make it
            </Text>
          </View>
        </Row>
      </View>

      {/* Resume an in-progress build */}
      {inProgress.length > 0 && (
        <View style={{ paddingHorizontal: space(4), marginBottom: space(6) }}>
          <SectionHeader title="Continue building" />
          {inProgress.map(({ product, step }) => {
            const steps = getGuide(product.id)?.steps.length ?? 1;
            return (
              <Card key={product.id} onPress={() => router.push(`/build/${product.id}`)}>
                <Row gap={space(3)}>
                  <View style={s.resumeArt}>
                    <Thumb product={product} size={64} />
                  </View>
                  <View style={{ flex: 1, gap: space(1.5) }}>
                    <Text style={[type.heading, { color: colors.text }]}>
                      {product.name} {product.descriptor}
                    </Text>
                    <Text style={[type.small, { color: colors.textDim }]}>
                      Step {step + 1} of {steps} · {getGuide(product.id)?.steps[step]?.title}
                    </Text>
                    <ProgressBar value={step / steps} />
                  </View>
                  <View style={s.playBtn}>
                    <Ionicons name="play" size={18} color={colors.canvas} />
                  </View>
                </Row>
              </Card>
            );
          })}
        </View>
      )}

      {/* Scanner entry points */}
      <View style={{ paddingHorizontal: space(4), marginBottom: space(6) }}>
        <SectionHeader title="Identify what you are building" action="All scanners" onAction={() => router.push('/scan')} />
        <View style={s.scanGrid}>
          {MODE_ORDER.map((m) => {
            const cfg = MODES[m];
            return (
              <Pressable
                key={m}
                onPress={() => router.push(`/scanner/${m}`)}
                style={({ pressed }) => [s.scanTile, pressed && { backgroundColor: colors.surfacePressed }]}
              >
                <Row style={{ justifyContent: 'space-between' }}>
                  <Ionicons name={cfg.icon} size={22} color={colors.ink} />
                  {cfg.live && <Chip label="Live" tone="success" />}
                </Row>
                <Text style={[type.body, { color: colors.text, marginTop: space(2.5) }]} numberOfLines={1}>
                  {cfg.title}
                </Text>
                <Text style={[type.small, { color: colors.textFaint }]} numberOfLines={2}>
                  {cfg.tagline}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Full guides */}
      <View style={{ marginBottom: space(6) }}>
        <View style={{ paddingHorizontal: space(4) }}>
          <SectionHeader title={`Guided builds · ${guided.length}`} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: space(4), gap: space(3) }}
        >
          {guided.map((p) => (
            <ProductCard key={p.id} product={p} onPress={() => router.push(`/product/${p.id}`)} />
          ))}
        </ScrollView>
      </View>

      {/* Recents */}
      {recents.length > 0 && (
        <View style={{ marginBottom: space(6) }}>
          <View style={{ paddingHorizontal: space(4) }}>
            <SectionHeader title="Recently viewed" action="Catalogue" onAction={() => router.push('/catalog')} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: space(4), gap: space(3) }}
          >
            {recents
              .map((id) => BY_ID[id])
              .filter(Boolean)
              .map((p) => (
                <ProductCard key={p.id} product={p} onPress={() => router.push(`/product/${p.id}`)} />
              ))}
          </ScrollView>
        </View>
      )}

      {/* Library footprint */}
      <View style={{ paddingHorizontal: space(4) }}>
        <SectionHeader title="In this prototype" />
        <Row gap={space(2.5)}>
          <StatTile value={String(PRODUCTS.length)} label="Products" />
          <StatTile value={String(guided.length)} label="Full guides" tone={colors.ink} />
          <StatTile value={String(totalSteps)} label="Steps authored" tone={colors.blue} />
        </Row>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  mark: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeArt: {
    width: 70,
    height: 70,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2.5) },
  scanTile: {
    width: '47.6%',
    flexGrow: 1,
    padding: space(3.5),
    minHeight: 112,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
