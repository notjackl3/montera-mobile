import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PRODUCTS } from '@/data/products';
import type { Category, Product } from '@/data/types';
import { Divider, Empty, Row } from '@/ui/components';
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

/** Popular when the search is empty: guided builds, most reviewed first. */
const POPULAR: Product[] = PRODUCTS.filter((p) => p.tier === 'full')
  .sort((a, b) => b.reviews - a.reviews)
  .slice(0, 5);

/**
 * A2 F-04 / IMP-3: one search bar at the top with auto-suggest chips under it.
 * Empty, the chips are popular builds and categories; typing, they become the
 * matching products and categories. This replaces the old two rows of filter
 * chips (category and detail level), per H3 minimalist design.
 */
function Suggest({ label, icon, active, onPress }: { label: string; icon?: keyof typeof Ionicons.glyphMap; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.suggest,
        active && { backgroundColor: colors.ink, borderColor: colors.ink },
        pressed && !active && { backgroundColor: colors.surfacePressed },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
    >
      {icon && <Ionicons name={icon} size={16} color={active ? colors.canvas : colors.ink} />}
      <Text style={[s.suggestText, { color: active ? colors.canvas : colors.ink }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function Catalog() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const input = useRef<TextInputInstance>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | 'all'>('all');

  // Home's "Search the catalogue" lands here with the keyboard up.
  useEffect(() => {
    if (!focus) return;
    const t = setTimeout(() => input.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [focus]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, '');
    // Guided builds first: they moved here from the home screen.
    const ordered = [...PRODUCTS].sort((a, b) => Number(b.tier === 'full') - Number(a.tier === 'full'));
    return ordered.filter((p) => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.descriptor.toLowerCase().includes(needle) ||
        p.finishName.toLowerCase().includes(needle) ||
        (digits.length >= 3 && (p.article.replace(/\D/g, '').includes(digits) || p.ean.includes(digits)))
      );
    });
  }, [q, cat]);

  const needle = q.trim().toLowerCase();
  const nameHits = needle
    ? [...new Set(results.map((p) => p.name))].filter((n) => n.toLowerCase() !== needle).slice(0, 4)
    : [];
  const catHits = needle ? CATEGORIES.filter((c) => c.key !== 'all' && c.label.toLowerCase().includes(needle)) : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space(2) }}>
      <ScreenHeader title="Catalogue" subtitle={`${PRODUCTS.length} seeded products`} />

      <View style={{ paddingHorizontal: space(4), marginBottom: space(3) }}>
        <Row gap={space(2.5)} style={s.search}>
          <Ionicons name="search" size={20} color={colors.textDim} />
          <TextInput
            ref={input}
            value={q}
            onChangeText={setQ}
            placeholder="Search name, finish or article no."
            placeholderTextColor={colors.textFaint}
            returnKeyType="search"
            accessibilityLabel="Search the catalogue"
            style={s.input}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')} hitSlop={8} style={s.clear} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={22} color={colors.textDim} />
            </Pressable>
          )}
        </Row>
      </View>

      {/* Auto-suggest chips: popular builds when empty, matches while typing. */}
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        style={s.chipRow}
        contentContainerStyle={s.chipRowInner}
      >
        <Text style={[type.micro, { color: colors.textFaint }]}>{needle ? 'SUGGESTIONS' : 'POPULAR'}</Text>
        {!needle &&
          POPULAR.map((p) => (
            <Suggest key={p.id} label={p.name} icon="construct-outline" onPress={() => router.push(`/product/${p.id}`)} />
          ))}
        {nameHits.map((n) => (
          <Suggest key={n} label={n} icon="search" onPress={() => setQ(n)} />
        ))}
        {catHits.map((c) => (
          <Suggest key={c.key} label={c.label} icon="albums-outline" onPress={() => { setCat(c.key); setQ(''); }} />
        ))}
        {needle && nameHits.length === 0 && catHits.length === 0 && (
          <Text style={[s.suggestText, { color: colors.textDim }]}>No suggestions</Text>
        )}
      </ScrollView>

      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        style={[s.chipRow, { marginBottom: space(3) }]}
        contentContainerStyle={s.chipRowInner}
      >
        {CATEGORIES.map((c) => (
          <Suggest key={c.key} label={c.label} active={cat === c.key} onPress={() => setCat(c.key)} />
        ))}
      </ScrollView>

      <FlatList
        data={results}
        keyboardShouldPersistTaps="handled"
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
            body="Try a shorter search, or pick Everything above."
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
  chipRow: { flexGrow: 0, flexShrink: 0, marginBottom: space(2) },
  chipRowInner: { paddingHorizontal: space(4), gap: space(2), alignItems: 'center' },
  suggest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    minHeight: 44,
    paddingHorizontal: space(3.5),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderBright,
    backgroundColor: colors.canvas,
  },
  suggestText: { fontSize: 16, fontFamily: type.body.fontFamily },
  input: { fontSize: 17, fontFamily: type.body.fontFamily, color: colors.text, flex: 1, minHeight: 52 },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  search: {
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderBright,
    paddingLeft: space(3.5),
    paddingRight: space(1),
  },
});
