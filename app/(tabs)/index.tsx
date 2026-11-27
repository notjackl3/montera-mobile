import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGuide } from '@/data/guides';
import { BY_ID } from '@/data/products';
import type { Product } from '@/data/types';
import { WEB_GUIDES, webGuideFor } from '@/data/webGuides';
import { useApp } from '@/store/useApp';
import { Button, ProgressBar, Row } from '@/ui/components';
import { Thumb } from '@/ui/Thumb';
import { colors, radius, space, type } from '@/ui/theme';

/**
 * Home: one obvious thing to do. The study found the old home (scanner grid,
 * carousels, stats) hid both catalogue search and the mid-build start, 4 of 4.
 * Scanners now live on the Scan tab and guided builds in the Catalogue.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const progress = useApp((st) => st.progress);

  const webProgress = useApp((st) => st.webProgress);

  // Native-guide builds and web-guide builds, in one list for the Continue row.
  type Item = { key: string; name: string; step: number; total: number; updatedAt: number; href: string; product?: Product };
  const inProgress: Item[] = [
    ...Object.entries(progress)
      .map(([id, p]) => ({ product: BY_ID[id], ...p }))
      // Catalogue products built in the web guide report there instead.
      .filter((x) => x.product && getGuide(x.product.id) && !webGuideFor(x.product.id))
      .map((x) => ({
        key: x.product.id,
        name: x.product.name,
        step: x.step,
        total: getGuide(x.product.id)!.steps.length,
        updatedAt: x.updatedAt,
        href: `/build/${x.product.id}`,
        product: x.product,
      })),
    ...Object.entries(webProgress).map(([id, p]) => ({
      key: id,
      name: p.name,
      step: p.step,
      total: p.total,
      updatedAt: p.updatedAt,
      href: `/guide/${id}?step=${p.step + 1}`,
    })),
  ].sort((a, b) => b.updatedAt - a.updatedAt);
  const latest = inProgress[0];
  const more = inProgress.length - 1;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space(3), paddingBottom: space(6), paddingHorizontal: space(4), gap: space(4) }}
      showsVerticalScrollIndicator={false}
    >
      <Row>
        <View style={s.mark}>
          <Ionicons name="cube" size={18} color={colors.canvas} />
        </View>
        <Text style={[type.display, { color: colors.text }]}>MONTERA</Text>
      </Row>

      {/* One "Continue" row for the most recent build, never a stack of cards. */}
      {latest && (
        <View>
          <Pressable
            onPress={() => router.push(latest.href as never)}
            style={({ pressed }) => [s.continue, pressed && { backgroundColor: colors.surfacePressed }]}
            accessibilityRole="button"
            accessibilityLabel={`Continue ${latest.name}, step ${latest.step + 1} of ${latest.total}`}
          >
            {latest.product ? (
              <Thumb product={latest.product} size={56} />
            ) : (
              <View style={s.webThumb}>
                <Ionicons name="cube-outline" size={28} color={colors.ink} />
              </View>
            )}
            <View style={{ flex: 1, gap: space(1.5) }}>
              <Text style={[type.micro, { color: colors.blue }]}>CONTINUE</Text>
              <Text style={[type.heading, { color: colors.text }]}>
                {latest.name} · Step {latest.step + 1} of {latest.total}
              </Text>
              <ProgressBar value={latest.step / latest.total} />
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.ink} />
          </Pressable>
          {more > 0 && (
            <Pressable onPress={() => router.push('/partway')} hitSlop={6} style={s.link}>
              <Text style={[type.body, { color: colors.blue, textDecorationLine: 'underline' }]}>
                {more} more in progress
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* The hero: about 60% of the screen. */}
      <View style={[s.hero, { minHeight: Math.round(height * 0.6) - (latest ? 120 : 0) }]}>
        <View style={{ gap: space(2) }}>
          <Ionicons name="barcode-outline" size={56} color={colors.ink} />
          <Text style={[type.display, { color: colors.text }]}>Start a build</Text>
          <Text style={[s.lead, { color: colors.textDim }]}>Scan the barcode on the side of the box. We open the right guide.</Text>
        </View>
        <View style={{ gap: space(2) }}>
          <Button label="Scan the box" icon="scan-outline" onPress={() => router.push('/scanner/article')} />
          <Pressable onPress={() => router.push('/catalog')} style={s.link} accessibilityRole="link">
            <Text style={[type.heading, { color: colors.blue, textAlign: 'center', textDecorationLine: 'underline' }]}>
              Pick from the catalogue
            </Text>
          </Pressable>
        </View>
      </View>

      {/* The web app's 3D guides, study cuts first. They open full screen in the build view. */}
      <View style={{ gap: space(2) }}>
        <Text style={[type.micro, { color: colors.textDim }]}>3D BUILD GUIDES</Text>
        {WEB_GUIDES.map((g) => {
          const p = webProgress[g.id];
          return (
            <Pressable
              key={g.id}
              onPress={() => router.push(`/guide/${g.id}`)}
              style={({ pressed }) => [s.guide, pressed && { backgroundColor: colors.surfacePressed }]}
              accessibilityRole="button"
              accessibilityLabel={`Build ${g.name}`}
            >
              <View style={{ flex: 1, gap: space(1) }}>
                <Text style={[type.heading, { color: colors.text }]}>{g.name}</Text>
                <Text style={[type.body, { color: colors.textDim }]}>
                  {p ? `Step ${p.step + 1} of ${p.total}` : `${g.steps} steps`}
                  {g.study ? ' · study build' : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.ink} />
            </Pressable>
          );
        })}
      </View>

      {/* Many people only arrive after a mistake, mid-build. */}
      <Pressable
        onPress={() => router.push('/partway')}
        style={({ pressed }) => [s.partway, pressed && { backgroundColor: colors.surfacePressed }]}
        accessibilityRole="button"
      >
        <Ionicons name="git-commit-outline" size={24} color={colors.ink} />
        <View style={{ flex: 1 }}>
          <Text style={[type.heading, { color: colors.text }]}>Already partway through?</Text>
          <Text style={[type.body, { color: colors.textDim }]}>Pick your build and the step you are on</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.ink} />
      </Pressable>
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
  continue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    padding: space(3),
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.lg,
  },
  hero: {
    justifyContent: 'space-between',
    padding: space(5),
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
  },
  lead: { fontSize: 18, lineHeight: 26, fontFamily: type.body.fontFamily },
  link: { minHeight: 48, justifyContent: 'center' },
  webThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    minHeight: 64,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    borderTopWidth: 1,
    borderColor: colors.hairline,
  },
  partway: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    minHeight: 72,
    paddingHorizontal: space(3),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hairline,
  },
});
