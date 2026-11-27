import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGuide } from '@/data/guides';
import { PRODUCTS } from '@/data/products';
import { useApp } from '@/store/useApp';
import { Row } from '@/ui/components';
import { StepList } from '@/ui/Timeline';
import { Thumb } from '@/ui/Thumb';
import { colors, radius, space, type } from '@/ui/theme';

/**
 * Mid-build entry. Mentors: many people only open the app after a mistake, so
 * starting mid-way must be as easy as starting from the box. Pick the product,
 * then the step the build is at; the build screen opens there.
 */
export default function Partway() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useApp((st) => st.progress);
  const [productId, setProductId] = useState<string | null>(null);

  // Builds already in progress first, most recent first.
  const guided = PRODUCTS.filter((p) => getGuide(p.id)).sort(
    (a, b) => (progress[b.id]?.updatedAt ?? 0) - (progress[a.id]?.updatedAt ?? 0),
  );
  const product = productId ? guided.find((p) => p.id === productId) : undefined;
  const guide = product ? getGuide(product.id) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space(2) }}>
      <Row gap={space(2)} style={{ paddingHorizontal: space(4), marginBottom: space(3) }}>
        <Pressable
          onPress={() => (product ? setProductId(null) : router.back())}
          hitSlop={6}
          style={s.iconBtn}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[type.title, { color: colors.text }]}>{product ? 'Which step are you on?' : 'What are you building?'}</Text>
          {product && (
            <Text style={[type.body, { color: colors.textDim }]}>
              {product.name} {product.descriptor}
            </Text>
          )}
        </View>
      </Row>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: insets.bottom + space(6) }}>
        {!product &&
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
