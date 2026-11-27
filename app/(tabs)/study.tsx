import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGuide } from '@/data/guides';
import { BY_ID } from '@/data/products';
import { mean, summarise } from '@/engine/study';
import { fmtDuration, fmtShort, useApp, type Session } from '@/store/useApp';
import { Button, Card, Chip, Divider, Empty, Row, SectionHeader, StatTile } from '@/ui/components';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { colors, radius, space, type } from '@/ui/theme';
import { FailAtStep } from '@/ui/Voice';
import { GUIDES } from '@/data/guides';

export default function StudyMode() {
  const insets = useSafeAreaInsets();
  const { sessions, resetDemo, voice, setVoice } = useApp();
  const maxSteps = Math.max(...Object.values(GUIDES).map((g) => g.steps.length));
  const [busy, setBusy] = useState(false);

  const { paired, paperSessions, digitalSessions, meanPaperSec, meanDigitalSec, deltaPct } =
    summarise(sessions);

  const paper = paperSessions;
  const digital = digitalSessions;
  const meanPaper = meanPaperSec;
  const meanDigital = meanDigitalSec;
  const delta = deltaPct;

  const exportJson = async () => {
    setBusy(true);
    try {
      const payload = {
        app: 'MONTERA mobile prototype',
        version: '0.1.0',
        exportedAt: new Date().toISOString(),
        summary: {
          sessions: sessions.length,
          completed: sessions.filter((s) => s.completed).length,
          // Means are over products built under BOTH conditions only.
          pairedProducts: paired.map((x) => x.product.id),
          meanPaperSec: Math.round(meanPaper),
          meanDigitalSec: Math.round(meanDigital),
          digitalFasterPct: Number(delta.toFixed(1)),
        },
        sessions: sessions.map((s) => {
          const p = BY_ID[s.productId];
          const guide = getGuide(s.productId);
          return {
            id: s.id,
            mode: s.mode,
            completed: s.completed,
            startedAt: new Date(s.startedAt).toISOString(),
            finishedAt: s.finishedAt ? new Date(s.finishedAt).toISOString() : null,
            elapsedSec: s.elapsedSec,
            stepTimes: s.stepTimes,
            product: p ? { id: p.id, name: p.name, article: p.article, baselineMin: p.baselineMin, timingSource: p.source } : null,
            stepTitles: guide?.steps.map((st) => st.title) ?? [],
          };
        }),
      };

      const json = JSON.stringify(payload, null, 2);
      const file = new File(Paths.document, `montera-sessions-${Date.now()}.json`);
      file.create({ overwrite: true });
      file.write(json);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Share.share({ message: json, title: 'MONTERA session export' });
      Alert.alert('Exported', `${sessions.length} sessions written to\n${file.name}`);
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space(2), paddingBottom: space(8) }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title="Study mode" subtitle="Paper manual against the 3D guide" />

      {/* Headline comparison */}
      <View style={{ paddingHorizontal: space(4) }}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={[type.micro, { color: colors.textFaint }]}>
              MEAN BUILD TIME · {paired.length} PAIRED {paired.length === 1 ? 'PRODUCT' : 'PRODUCTS'}
            </Text>
            <Chip
              label={`${delta >= 0 ? '' : '+'}${Math.abs(delta).toFixed(0)}% ${delta >= 0 ? 'faster in 3D' : 'slower in 3D'}`}
              tone={delta >= 0 ? 'success' : 'danger'}
            />
          </Row>

          <View style={{ marginTop: space(4), gap: space(3.5) }}>
            <CompareBar
              label="Paper manual"
              seconds={meanPaper}
              max={Math.max(meanPaper, meanDigital)}
              tone={colors.inkSoft}
              n={paper.length}
            />
            <CompareBar
              label="MONTERA 3D"
              seconds={meanDigital}
              max={Math.max(meanPaper, meanDigital)}
              tone={colors.blue}
              n={digital.length}
            />
          </View>
        </Card>

        <Row gap={space(2.5)} style={{ marginTop: space(3) }}>
          <StatTile value={String(sessions.length)} label="Sessions" />
          <StatTile value={String(paired.length)} label="Paired products" tone={colors.blue} />
          <StatTile value={fmtShort(mean(sessions.map((s) => s.elapsedSec)))} label="Mean overall" />
        </Row>
      </View>

      {/* Per-product */}
      {paired.length > 0 && (
        <View style={{ paddingHorizontal: space(4), marginTop: space(6) }}>
          <SectionHeader title="By product" />
          <Card padded={false}>
            {paired.map((row, i) => {
              const saved = row.savedPct;
              return (
                <View key={row.product.id}>
                  {i > 0 && <Divider />}
                  <View style={{ padding: space(3.5), gap: space(2.5) }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text style={[type.heading, { color: colors.text }]}>
                        {row.product.name} {row.product.descriptor}
                      </Text>
                      <Text style={[type.small, { color: saved >= 0 ? colors.success : colors.danger }]}>
                        {saved >= 0 ? '−' : '+'}
                        {Math.abs(saved).toFixed(0)}%
                      </Text>
                    </Row>
                    <CompareBar label="Paper" seconds={row.paperSec} max={row.paperSec} tone={colors.textFaint} compact />
                    <CompareBar label="3D" seconds={row.digitalSec} max={row.paperSec} tone={colors.blue} compact />
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      )}

      {/* Session log */}
      <View style={{ paddingHorizontal: space(4), marginTop: space(6) }}>
        <SectionHeader title={`Session log · ${sessions.length}`} />
        {sessions.length === 0 ? (
          <Empty icon="stats-chart-outline" title="No sessions yet" body="Finish a guided build and it will be recorded here." />
        ) : (
          <Card padded={false}>
            {sessions.map((sess, i) => (
              <View key={sess.id}>
                {i > 0 && <Divider />}
                <SessionRow session={sess} />
              </View>
            ))}
          </Card>
        )}
      </View>

      {/* Wizard-of-Oz voice */}
      <View style={{ paddingHorizontal: space(4), marginTop: space(6) }}>
        <SectionHeader title="Voice (Wizard of Oz)" />
        <Card>
          <View style={{ gap: space(3) }}>
            <Text style={[type.body, { color: colors.text }]}>
              There is no speech recognition. During a build, long-press the “Hey IKEA” banner, or open Build settings,
              to fire scripted commands as if they were heard.
            </Text>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={[type.heading, { color: colors.text }]}>Show the “Hey IKEA” banner</Text>
              <Chip
                label={voice.banner ? 'On' : 'Off'}
                active={voice.banner}
                onPress={() => setVoice({ banner: !voice.banner })}
              />
            </Row>
            <FailAtStep stepCount={maxSteps} />
          </View>
        </Card>
      </View>

      {/* Export + attribution */}
      <View style={{ paddingHorizontal: space(4), marginTop: space(6), gap: space(2.5) }}>
        <Button label="Export sessions as JSON" icon="download-outline" onPress={exportJson} loading={busy} />
        <Button
          label="Reset demo data"
          icon="refresh-outline"
          variant="ghost"
          onPress={() =>
            Alert.alert('Reset demo data?', 'Restores the seeded sessions and clears anything recorded in this run.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', style: 'destructive', onPress: resetDemo },
            ])
          }
        />

        <View style={s.attrib}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textFaint} />
          <Text style={[type.small, { color: colors.textFaint, flex: 1, lineHeight: 19 }]}>
            Baseline timings reference the IKEA-ASM, IKEA-Manual and IKEA Manuals-at-Work datasets (CC BY-NC / CC
            BY-NC-SA). Seeded sessions are illustrative, not collected data.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function CompareBar({
  label,
  seconds,
  max,
  tone,
  n,
  compact,
}: {
  label: string;
  seconds: number;
  max: number;
  tone: string;
  n?: number;
  compact?: boolean;
}) {
  const pct = max > 0 ? Math.max(0.04, seconds / max) : 0;
  return (
    <View style={{ gap: space(1.5) }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={space(2)}>
          <Text style={[compact ? type.small : type.body, { color: colors.text }]}>{label}</Text>
          {n !== undefined && <Text style={[type.micro, { color: colors.textFaint }]}>n={n}</Text>}
        </Row>
        <Text style={[type.mono, { color: tone }]}>{fmtDuration(seconds)}</Text>
      </Row>
      <View style={{ height: compact ? 8 : 14, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: tone, borderRadius: 4 }} />
      </View>
    </View>
  );
}

function SessionRow({ session }: { session: Session }) {
  const product = BY_ID[session.productId];
  const baseline = product ? product.baselineMin * 60 : 0;
  const delta = baseline > 0 ? ((baseline - session.elapsedSec) / baseline) * 100 : 0;
  const when = new Date(session.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <Row style={{ padding: space(3.5) }} gap={space(3)}>
      <View
        style={[
          s.modeBadge,
          session.mode === 'digital'
            ? { backgroundColor: colors.blueDim, borderColor: colors.blue }
            : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
        ]}
      >
        <Ionicons
          name={session.mode === 'digital' ? 'cube' : 'document-text-outline'}
          size={16}
          color={session.mode === 'digital' ? colors.blue : colors.textDim}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color: colors.text }]} numberOfLines={1}>
          {product ? `${product.name} ${product.descriptor}` : session.productId}
        </Text>
        <Text style={[type.small, { color: colors.textFaint }]}>
          {session.mode === 'digital' ? '3D guide' : 'Paper manual'} · {when}
          {session.stepTimes.length > 0 ? ` · ${session.stepTimes.length} steps timed` : ''}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[type.mono, { color: colors.text }]}>{fmtDuration(session.elapsedSec)}</Text>
        {baseline > 0 && (
          <Text style={[type.micro, { color: delta >= 0 ? colors.success : colors.warn }]}>
            {delta >= 0 ? '−' : '+'}
            {Math.abs(delta).toFixed(0)}% vs base
          </Text>
        )}
      </View>
    </Row>
  );
}

const s = StyleSheet.create({
  modeBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attrib: {
    flexDirection: 'row',
    gap: space(2.5),
    alignItems: 'flex-start',
    padding: space(3.5),
    marginTop: space(2),
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
