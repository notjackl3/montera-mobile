import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PRODUCTS } from '@/data/products';
import type { Category, Tier } from '@/data/types';
import { Chip, Divider, Empty, Row } from '@/ui/components';
import { ProductRow } from '@/ui/ProductRow';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { colors, radius, space, type } from '@/ui/theme';

const CATEGORIES: { key: Category | 'all'; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'shelf', label: 'Shelving' },
  { key: 'table', label: 'Tables' },
  { key: 'desk', label: 'Desks' },
  { key: 'storage', label: 'Storage' },
  { key: 'seating', label: 'Seating' },
  { key: 'bed', label: 'Beds' },
];

const TIERS: { key: Tier | 'all'; label: string }[] = [
  { key: 'all', label: 'All detail levels' },
  { key: 'full', label: 'Guided only' },
  { key: 'simplified', label: '3D model' },
  { key: 'parts', label: 'Parts only' },
];

export default function Catalog() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [tier, setTier] = useState<Tier | 'all'>('all');

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, '');
    // Guided builds first: they moved here from the home screen.
    const ordered = [...PRODUCTS].sort((a, b) => Number(b.tier === 'full') - Number(a.tier === 'full'));
    return ordered.filter((p) => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (tier !== 'all' && p.tier !== tier) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.descriptor.toLowerCase().includes(needle) ||
        p.finishName.toLowerCase().includes(needle) ||
        (digits.length >= 3 && (p.article.replace(/\D/g, '').includes(digits) || p.ean.includes(digits)))
      );
    });
  }, [q, cat, tier]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space(2) }}>
      <ScreenHeader title="Catalogue" subtitle={`${PRODUCTS.length} seeded products`} />

      <View style={{ paddingHorizontal: space(4), marginBottom: space(3) }}>
        <Row gap={space(2.5)} style={s.search}>
          <Ionicons name="search" size={18} color={colors.textFaint} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Name, finish, or article number"
            placeholderTextColor={colors.textFaint}
            style={{ ...type.body, color: colors.text, flex: 1, paddingVertical: space(3) }}
          />
          {q.length > 0 && (
            <Ionicons name="close-circle" size={18} color={colors.textFaint} onPress={() => setQ('')} />
          )}
        </Row>
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space(4), gap: space(2), alignItems: 'center' }}
        style={s.filterRow}
        renderItem={({ item }) => (
          <Chip label={item.label} active={cat === item.key} onPress={() => setCat(item.key)} />
        )}
      />

      <FlatList
        horizontal
        data={TIERS}
        keyExtractor={(t) => t.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space(4), gap: space(2), alignItems: 'center' }}
        style={[s.filterRow, { marginBottom: space(3) }]}
        renderItem={({ item }) => (
          <Chip label={item.label} active={tier === item.key} onPress={() => setTier(item.key)} />
        )}
      />

      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        ItemSeparatorComponent={Divider}
        contentContainerStyle={{ paddingBottom: space(6) }}
        ListHeaderComponent={
          <Text style={[type.micro, { color: colors.textFaint, paddingHorizontal: space(4), paddingBottom: space(2) }]}>
            {results.length} {results.length === 1 ? 'RESULT' : 'RESULTS'}
          </Text>
        }
        ListEmptyComponent={
          <Empty
            icon="search-outline"
            title="Nothing matches"
            body="Try a shorter search, or clear the category and detail filters."
          />
        }
        renderItem={({ item }) => (
          <ProductRow product={item} onPress={() => router.push(`/product/${item.id}`)} />
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  filterRow: { flexGrow: 0, flexShrink: 0, height: 34, marginBottom: space(2.5) },
  search: {
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: space(3.5),
  },
});
