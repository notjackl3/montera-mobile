import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGuide } from '@/data/guides';
import { BY_ID, PRODUCTS } from '@/data/products';
import { WEB_GUIDES, webGuideFor, type WebGuide } from '@/data/webGuides';
import { useApp } from '@/store/useApp';
import { Row } from '@/ui/components';
import { StepList } from '@/ui/Timeline';
import { Thumb } from '@/ui/Thumb';
import { colors, radius, space, type } from '@/ui/theme';

/**
 * Mid-build entry. Mentors: many people only open the app after a mistake, so
 * starting mid-way must be as easy as starting from the box. Pick the product,
 * then the step the build is at; the build screen opens there.
 *
 * `?product=<id>` (from the product screen's "I'm already partway", A2 F-07)
 * skips straight to the step list. Builds that run in the web app's 3D guide
 * (HUTTEN, LACK) are listed too and open the web guide at that step.
 */
export default function Partway() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ product?: string }>();
  const progress = useApp((st) => st.progress);
  const webProgress = useApp((st) => st.webProgress);
  const initialWeb = webGuideFor(params.product);
  const [productId, setProductId] = useState<string | null>(initialWeb ? null : (params.product ?? null));
  const [webId, setWebId] = useState<string | null>(initialWeb?.id ?? null);
  const cameWithPick = !!params.product;

  // Builds already in progress first, most recent first. Web-guide products
  // are listed once, as their web guide.
  const guided = PRODUCTS.filter((p) => getGuide(p.id) && !webGuideFor(p.id)).sort(
    (a, b) => (progress[b.id]?.updatedAt ?? 0) - (progress[a.id]?.updatedAt ?? 0),
  );
  const webs = [...WEB_GUIDES].sort((a, b) => (webProgress[b.id]?.updatedAt ?? 0) - (webProgress[a.id]?.updatedAt ?? 0));
  const product = productId ? guided.find((p) => p.id === productId) : undefined;
  const guide = product ? getGuide(product.id) : undefined;
  const web: WebGuide | undefined = webId ? webs.find((w) => w.id === webId) : undefined;
  const picked = !!(product || web);
  // The catalogue entry for a web guide, for its thumbnail.
  const webThumb = (w: WebGuide) => PRODUCTS.find((p) => webGuideFor(p.id)?.id === w.id) ?? BY_ID[w.id];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space(2) }}>
      <Row gap={space(2)} style={{ paddingHorizontal: space(4), marginBottom: space(3) }}>
        <Pressable
          onPress={() => {
            if (picked && !cameWithPick) {
              setProductId(null);
              setWebId(null);
            } else router.back();
          }}
          hitSlop={6}
          style={s.iconBtn}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[type.title, { color: colors.text }]}>{picked ? 'Which step are you on?' : 'What are you building?'}</Text>
          {product && (
            <Text style={[type.body, { color: colors.textDim }]}>
              {product.name} {product.descriptor}
            </Text>
          )}
          {web && <Text style={[type.body, { color: colors.textDim }]}>{web.name}</Text>}
        </View>
      </Row>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: insets.bottom + space(6) }}>
        {!picked &&
          webs.map((w) => {
            const at = webProgress[w.id]?.step;
            const thumb = webThumb(w);
            return (
              <Pressable
                key={`web-${w.id}`}
                onPress={() => {
                  Haptics.selectionAsync();
                  setWebId(w.id);
                }}
                style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.surfacePressed }]}
                accessibilityRole="button"
              >
                {thumb ? (
                  <Thumb product={thumb} size={52} />
                ) : (
                  <View style={s.webThumb}>
                    <Ionicons name="cube-outline" size={26} color={colors.ink} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[type.heading, { color: colors.text }]}>{w.name}</Text>
                  <Text style={[type.body, { color: at !== undefined ? colors.blue : colors.textDim }]}>
                    {at !== undefined ? `In progress · step ${at + 1} of ${w.steps}` : `${w.steps} steps · 3D guide`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.ink} />
              </Pressable>
            );
          })}

        {!picked &&
          guided.map((p) => {
            const at = progress[p.id]?.step;
            const n = getGuide(p.id)!.steps.length;
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setProductId(p.id);
                }}
                style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.surfacePressed }]}
                accessibilityRole="button"
              >
                <Thumb product={p} size={52} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.heading, { color: colors.text }]}>
                    {p.name} {p.descriptor}
                  </Text>
                  <Text style={[type.body, { color: at !== undefined ? colors.blue : colors.textDim }]}>
                    {at !== undefined ? `In progress · step ${at + 1} of ${n}` : `${n} steps`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.ink} />
              </Pressable>
            );
          })}

        {web && (
          <>
            <Text style={[type.body, { color: colors.textDim, marginBottom: space(2) }]}>
              Pick the first step you have not finished. The 3D guide opens there.
            </Text>
            {Array.from({ length: web.steps }, (_, i) => {
              const at = webProgress[web.id]?.step;
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.replace(`/guide/${web.id}?step=${i + 1}`);
                  }}
                  style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.surfacePressed }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Step ${i + 1} of ${web.steps}`}
                >
                  <View style={[s.num, at === i && { backgroundColor: colors.accent }]}>
                    <Text style={[type.heading, { color: colors.ink }]}>{i + 1}</Text>
                  </View>
                  <Text style={[type.heading, { color: colors.text, flex: 1 }]}>
                    {web.titles?.[i] ?? `Step ${i + 1}`}
                    {at === i ? ' · where you left off' : ''}
                  </Text>
                  <Ionicons name="chevron-forward" size={22} color={colors.ink} />
                </Pressable>
              );
            })}
          </>
        )}

        {product && guide && (
          <>
            <Text style={[type.body, { color: colors.textDim, marginBottom: space(2) }]}>
              Pick the first step you have not finished. If something went wrong, open the build and tap “Something’s wrong”.
            </Text>
            <StepList
              steps={guide.steps}
              current={progress[product.id]?.step}
              onPick={(i) => router.replace(`/build/${product.id}?step=${i + 1}`)}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webThumb: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    minHeight: 76,
    paddingVertical: space(2),
    paddingHorizontal: space(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
});
