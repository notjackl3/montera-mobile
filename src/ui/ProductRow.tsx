import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Product } from '@/data/types';
import { pieceCount } from '@/engine/pose';
import { Chip, Difficulty, Row } from './components';
import { Thumb } from './Thumb';
import { colors, radius, space, type } from './theme';

const TIER_LABEL: Record<Product['tier'], { label: string; tone: 'success' | 'blue' | 'neutral' }> = {
  full: { label: 'Guided', tone: 'success' },
  simplified: { label: '3D model', tone: 'blue' },
  parts: { label: 'Parts only', tone: 'neutral' },
};

export function ProductRow({ product, onPress }: { product: Product; onPress: () => void }) {
  const tier = TIER_LABEL[product.tier];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.surfacePressed }]}
    >
      <View style={s.thumbBox}>
        <Thumb product={product} size={56} />
      </View>

      <View style={{ flex: 1, gap: space(1) }}>
        <Row gap={space(1.5)}>
          <Text style={[type.heading, { color: colors.text }]} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={[type.small, { color: colors.textFaint, flex: 1 }]} numberOfLines={1}>
            {product.descriptor}
          </Text>
        </Row>

        <Text style={[type.small, { color: colors.textDim }]} numberOfLines={1}>
          {product.dims.w}×{product.dims.d}×{product.dims.h} cm · {pieceCount(product)} pieces · {product.baselineMin} min
        </Text>

        <Row gap={space(1.5)} style={{ marginTop: space(0.5) }}>
          <Chip label={tier.label} tone={tier.tone} />
          <Difficulty level={product.difficulty} />
          {product.people === 2 && <Ionicons name="people-outline" size={13} color={colors.textFaint} />}
        </Row>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

/** Square card for horizontal carousels. */
export function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}>
      <View style={s.cardArt}>
        <Thumb product={product} size={96} />
      </View>
      <Text style={[type.heading, { color: colors.text }]} numberOfLines={1}>
        {product.name}
      </Text>
      <Text style={[type.small, { color: colors.textFaint }]} numberOfLines={1}>
        {product.descriptor}
      </Text>
      <Row gap={space(1.5)} style={{ marginTop: space(1) }}>
        <Ionicons name="time-outline" size={13} color={colors.textDim} />
        <Text style={[type.small, { color: colors.textDim }]}>{product.baselineMin} min</Text>
        <View style={{ flex: 1 }} />
        <Difficulty level={product.difficulty} size={5} />
      </Row>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingVertical: space(3),
    paddingHorizontal: space(4),
  },
  thumbBox: {
    width: 62,
    height: 62,
    borderRadius: radius.md,
    backgroundColor: colors.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 164,
    gap: space(0.5),
    padding: space(3),
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardArt: {
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    marginBottom: space(2),
  },
});
