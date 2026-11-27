import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGuide } from '@/data/guides';
import { BY_ID } from '@/data/products';
import type { Product } from '@/data/types';
import { WEB_GUIDES, webGuideFor } from '@/data/webGuides';
import { useApp } from '@/store/useApp';
import { Button, ProgressBar, Row } from '@/ui/components';
import { Sheet } from '@/ui/Sheet';
import { Thumb } from '@/ui/Thumb';
import { colors, radius, space, type } from '@/ui/theme';

/** Support links for the menu. Opened in the browser. */
const SUPPORT = [
  { label: 'IKEA help line', sub: 'Call or chat with IKEA customer service', icon: 'call-outline', url: 'https://www.ikea.com/ca/en/customer-service/contact-us/' },
  { label: 'Missing or broken part', sub: 'Order a free spare part from IKEA', icon: 'help-buoy-outline', url: 'https://www.ikea.com/ca/en/customer-service/spare-parts/' },
] as const;

/**
 * Home: one obvious thing to do. The study found the old home (scanner grid,
 * carousels, stats) hid both catalogue search and the mid-build start, 4 of 4.
 * Scanners now live on the Scan tab and guided builds in the Catalogue.
 *
 * A2 F-04 / IMP-3 (H3 minimalist design): one hero, "Start new build / Scan
 * box", takes ~60% of the screen. Its only other path is the catalogue search
 * bar. Build history and support moved into the header menu, not cards here.
 * A2 F-07: "Already partway through?" sits right under the hero and looks
 * nothing like it (outlined row, different icon, explanatory sublabel).
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
  const [menu, setMenu] = useState(false);
  const go = (href: string) => {
    setMenu(false);
    router.push(href as never);
  };

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
        <Text style={[type.display, { color: colors.text, flex: 1 }]}>MONTERA</Text>
        <Pressable
          onPress={() => setMenu(true)}
          style={({ pressed }) => [s.menuBtn, pressed && { backgroundColor: colors.surfacePressed }]}
          accessibilityRole="button"
          accessibilityLabel="Menu: your builds and help"
        >
          <Ionicons name="menu" size={22} color={colors.ink} />
          <Text style={[type.heading, { color: colors.ink }]}>Menu</Text>
        </Pressable>
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
        </View>
      )}

      {/* The hero: about 60% of the screen. */}
      <View style={[s.hero, { minHeight: Math.round(height * 0.6) - (latest ? 120 : 0) }]}>
        <View style={{ gap: space(2) }}>
          <Ionicons name="barcode-outline" size={56} color={colors.ink} />
          <Text style={[type.display, { color: colors.text }]}>Start new build</Text>
          <Text style={[s.lead, { color: colors.textDim }]}>Scan the barcode on the side of the box. We open the right guide.</Text>
        </View>
        <View style={{ gap: space(3) }}>
          <Button label="Scan box" icon="scan-outline" onPress={() => router.push('/scanner/article')} />
          {/* The one way into catalogue search: looks like the search bar it opens. */}
          <Pressable
            onPress={() => router.push({ pathname: '/catalog', params: { focus: String(Date.now()) } })}
            style={({ pressed }) => [s.search, pressed && { backgroundColor: colors.surfacePressed }]}
            accessibilityRole="search"
            accessibilityLabel="No box? Search the catalogue"
          >
            <Ionicons name="search" size={20} color={colors.textDim} />
            <Text style={[s.lead, { color: colors.textDim, flex: 1 }]}>No box? Search the catalogue</Text>
          </Pressable>
        </View>
      </View>

      {/* Many people only arrive after a mistake, mid-build. */}
      <Pressable
        onPress={() => router.push('/partway')}
        style={({ pressed }) => [s.partway, pressed && { backgroundColor: colors.surfacePressed }]}
        accessibilityRole="button"
        accessibilityLabel="Already partway through? Pick your build and the step you are on"
      >
        <Ionicons name="git-commit-outline" size={24} color={colors.ink} />
        <View style={{ flex: 1 }}>
          <Text style={[type.heading, { color: colors.text }]}>Already partway through?</Text>
          <Text style={[s.sub, { color: colors.textDim }]}>Pick your build and the step you are on. We open the guide there.</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.ink} />
      </Pressable>

      {/* The web app's 3D guides, study cuts first. Kept quiet (small type, hairline rows)
          so they never compete with the hero. They open full screen in the build view. */}
      <View style={{ gap: space(1), marginTop: space(2) }}>
        <Text style={[type.micro, { color: colors.textFaint }]}>3D BUILD GUIDES</Text>
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
                <Text style={[s.guideName, { color: colors.text }]}>{g.name}</Text>
                <Text style={[type.small, { color: colors.textDim }]}>
                  {p ? `Step ${p.step + 1} of ${p.total}` : `${g.steps} steps`}
                  {g.study ? ' · study build' : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </Pressable>
          );
        })}
      </View>

      <Sheet visible={menu} onClose={() => setMenu(false)} title="Menu">
        <ScrollView contentContainerStyle={{ paddingBottom: space(2) }}>
          <Text style={[type.micro, { color: colors.textFaint, marginBottom: space(1) }]}>YOUR BUILDS</Text>
          {inProgress.length === 0 && (
            <Text style={[s.sub, { color: colors.textDim, paddingVertical: space(3) }]}>No builds in progress yet.</Text>
          )}
          {inProgress.map((b) => (
            <Pressable
              key={b.key}
              onPress={() => go(b.href)}
              style={({ pressed }) => [s.menuRow, pressed && { backgroundColor: colors.surfacePressed }]}
              accessibilityRole="button"
              accessibilityLabel={`Continue ${b.name}, step ${b.step + 1} of ${b.total}`}
            >
              <Ionicons name="time-outline" size={22} color={colors.ink} />
              <View style={{ flex: 1 }}>
                <Text style={[type.heading, { color: colors.text }]}>{b.name}</Text>
                <Text style={[s.sub, { color: colors.blue }]}>Step {b.step + 1} of {b.total}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.ink} />
            </Pressable>
          ))}

          <Text style={[type.micro, { color: colors.textFaint, marginTop: space(5), marginBottom: space(1) }]}>HELP</Text>
          {SUPPORT.map((l) => (
            <Pressable
              key={l.label}
              onPress={() => {
                setMenu(false);
                Linking.openURL(l.url).catch(() => {});
              }}
              style={({ pressed }) => [s.menuRow, pressed && { backgroundColor: colors.surfacePressed }]}
              accessibilityRole="link"
            >
              <Ionicons name={l.icon} size={22} color={colors.ink} />
              <View style={{ flex: 1 }}>
                <Text style={[type.heading, { color: colors.text }]}>{l.label}</Text>
                <Text style={[s.sub, { color: colors.textDim }]}>{l.sub}</Text>
              </View>
              <Ionicons name="open-outline" size={20} color={colors.ink} />
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
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
  sub: { fontSize: 16, lineHeight: 22, fontFamily: type.body.fontFamily },
  guideName: { fontSize: 16, fontFamily: type.body.fontFamily },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    minHeight: 48,
    paddingHorizontal: space(3.5),
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.pill,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
    minHeight: 56,
    paddingHorizontal: space(4),
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.borderBright,
    borderRadius: radius.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    minHeight: 64,
    paddingVertical: space(2),
    paddingHorizontal: space(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
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
    minHeight: 56,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    borderTopWidth: 1,
    borderColor: colors.hairline,
  },
  // Outlined, never filled: it must not read as a second "start" button (F-07).
  partway: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    minHeight: 72,
    padding: space(3),
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.lg,
  },
});
