import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lookupCode } from '@/data/products';
import { MODE_ORDER, MODES } from '@/engine/scanners';
import { Card, Chip, Row } from '@/ui/components';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Thumb } from '@/ui/Thumb';
import { colors, radius, space, type } from '@/ui/theme';

export default function ScanHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');

  const match = code.replace(/\D/g, '').length >= 4 ? lookupCode(code) : undefined;
  const searched = code.replace(/\D/g, '').length >= 4;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space(2), paddingBottom: space(8) }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title="Scan" subtitle="Four ways to tell MONTERA what is in front of you" />

      <View style={{ paddingHorizontal: space(4), gap: space(3) }}>
        {MODE_ORDER.map((m) => {
          const cfg = MODES[m];
          return (
            <Pressable
              key={m}
              onPress={() => router.push(`/scanner/${m}`)}
              style={({ pressed }) => [s.modeCard, pressed && { backgroundColor: colors.surfacePressed }]}
            >
              <View style={s.modeIcon}>
                <Ionicons name={cfg.icon} size={24} color={colors.ink} />
              </View>
              <View style={{ flex: 1, gap: space(1) }}>
                <Row gap={space(2)}>
                  <Text style={[type.heading, { color: colors.text }]}>{cfg.title}</Text>
                  <Chip label={cfg.live ? 'Live' : 'Simulated'} tone={cfg.live ? 'success' : 'warn'} />
                </Row>
                <Text style={[type.small, { color: colors.textDim }]}>{cfg.tagline}</Text>
                {cfg.liveNote && (
                  <Text style={[type.small, { color: colors.textFaint, marginTop: space(0.5) }]}>
                    {cfg.liveNote}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          );
        })}
      </View>

      {/* Keyboard fallback — the thing you actually want when a demo room has bad light. */}
      <View style={{ paddingHorizontal: space(4), marginTop: space(6) }}>
        <Card>
          <Row gap={space(2)} style={{ marginBottom: space(3) }}>
            <Ionicons name="keypad-outline" size={18} color={colors.textDim} />
            <Text style={[type.heading, { color: colors.text }]}>Type the article number</Text>
          </Row>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="404.312.09"
            placeholderTextColor={colors.textFaint}
            keyboardType="numbers-and-punctuation"
            style={s.input}
          />

          {searched && match && (
            <Pressable
              onPress={() => router.push(`/product/${match.id}`)}
              style={({ pressed }) => [s.matchRow, pressed && { opacity: 0.8 }]}
            >
              <Thumb product={match} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { color: colors.text }]}>
                  {match.name} {match.descriptor}
                </Text>
                <Text style={[type.mono, { color: colors.success }]}>{match.article}</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.blue} />
            </Pressable>
          )}

          {searched && !match && (
            <Text style={[type.small, { color: colors.textFaint, marginTop: space(3) }]}>
              No product in the seeded catalogue matches that. Try 404.312.09, 002.638.50 or 802.758.87.
            </Text>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3.5),
    padding: space(4),
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  modeIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    ...type.mono,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space(3.5),
    paddingVertical: space(3.5),
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    marginTop: space(3),
    padding: space(3),
    backgroundColor: colors.successDim,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.success,
  },
});
