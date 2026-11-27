import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Step } from '@/data/types';
import { isCritical } from '@/engine/build';
import { colors, font, radius, space, type } from './theme';

/**
 * The step timeline. Every step is a numbered, tappable pip; done steps are
 * ink, the current one yellow (ink number), later ones outlined. Critical steps
 * carry a small yellow marker, so problem steps show up front, like roadworks
 * on a map. Pressing a pip shows its title; releasing jumps to it.
 *
 * In undo mode the steps being taken apart are drawn with an arrow running
 * backward from where the user was to the step that went wrong, so "I am going
 * back in order to go forward" is visible at a glance.
 */
export function Timeline({
  steps,
  current,
  onJump,
  undo,
}: {
  steps: Step[];
  current: number;
  onJump?: (i: number) => void;
  /** `from` is where the user was, `to` the step that went wrong, `at` the step on screen. */
  undo?: { from: number; to: number; at: number };
}) {
  const [peek, setPeek] = useState<number | null>(null);
  const n = steps.length;
  const shown = peek ?? (undo ? undo.at : current);

  return (
    <View>
      <View style={s.row}>
        {steps.map((st, i) => {
          const inUndo = undo && i >= undo.to && i <= undo.from;
          const undone = undo && inUndo && i > undo.at;
          const isHead = undo && i === undo.at;
          const done = !undo && i < current;
          const now = !undo && i === current;

          const fill = isHead
            ? colors.blue
            : now
              ? colors.accent
              : done || (undo && i < undo.to)
                ? colors.ink
                : colors.canvas;
          const fg = isHead || done || (undo && i < undo.to) ? colors.onDark : colors.ink;
          const border = undone ? colors.hairline : inUndo ? colors.ink : now || done ? fill : colors.borderBright;

          return (
            <Pressable
              key={st.id}
              disabled={!onJump}
              onPressIn={() => setPeek(i)}
              onPressOut={() => setPeek(null)}
              onPress={() => {
                Haptics.selectionAsync();
                onJump?.(i);
              }}
              style={s.hit}
              accessibilityRole="button"
              accessibilityLabel={`Step ${i + 1}: ${st.title}${isCritical(st) ? ', watch out' : ''}`}
            >
              <View
                style={[
                  s.pip,
                  { backgroundColor: fill, borderColor: border, borderStyle: undone ? 'dashed' : 'solid' },
                  (now || isHead) && { borderWidth: 2, borderColor: colors.ink },
                ]}
              >
                <Text style={{ fontFamily: font.bold, fontSize: 16, color: undone ? colors.textFaint : fg }}>{i + 1}</Text>
              </View>
              {isCritical(st) && <View style={s.marker} />}
            </Pressable>
          );
        })}

        {undo && (
          <View
            pointerEvents="none"
            style={[
              s.arrow,
              { left: `${(undo.to / n) * 100}%`, width: `${((undo.from - undo.to + 1) / n) * 100}%` },
            ]}
          >
            <Ionicons name="arrow-back" size={16} color={colors.ink} style={{ marginLeft: -2, marginTop: -7 }} />
          </View>
        )}
      </View>

      <Text style={[type.body, { color: colors.text, marginTop: undo ? space(3.5) : space(1) }]} numberOfLines={1}>
        <Text style={{ fontFamily: font.bold }}>{shown + 1}</Text> · {steps[shown]?.title}
        {isCritical(steps[shown]) ? '  ·  watch out' : ''}
      </Text>
    </View>
  );
}

/**
 * Vertical, full-width version for choosing a step: "Which step went wrong?"
 * and "Which step are you on?". Big rows, titles visible, critical steps marked.
 */
export function StepList({
  steps,
  selectableUpTo,
  current,
  onPick,
}: {
  steps: Step[];
  /** Steps after this index are greyed out (you cannot undo what is not built). */
  selectableUpTo?: number;
  current?: number;
  onPick: (i: number) => void;
}) {
  return (
    <View>
      {steps.map((st, i) => {
        const enabled = selectableUpTo === undefined || i <= selectableUpTo;
        return (
          <Pressable
            key={st.id}
            disabled={!enabled}
            onPress={() => {
              Haptics.selectionAsync();
              onPick(i);
            }}
            style={({ pressed }) => [s.listRow, pressed && { backgroundColor: colors.surfacePressed }, !enabled && { opacity: 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel={`Step ${i + 1}: ${st.title}`}
          >
            <View
              style={[
                s.listNum,
                i === current
                  ? { backgroundColor: colors.accent, borderColor: colors.ink }
                  : current !== undefined && i < current
                    ? { backgroundColor: colors.ink, borderColor: colors.ink }
                    : null,
              ]}
            >
              <Text
                style={{
                  fontFamily: font.bold,
                  fontSize: 17,
                  color: current !== undefined && i < current ? colors.onDark : colors.ink,
                }}
              >
                {i + 1}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[type.heading, { color: colors.text }]}>{st.title}</Text>
              {isCritical(st) && (
                <View style={s.watch}>
                  <View style={s.markerInline} />
                  <Text style={[type.body, { color: colors.text }]}>Easy to get wrong</Text>
                </View>
              )}
            </View>
            {enabled && <Ionicons name="chevron-forward" size={22} color={colors.ink} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row' },
  hit: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
  pip: {
    alignSelf: 'stretch',
    marginHorizontal: 2,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  arrow: { position: 'absolute', bottom: -8, height: 2, backgroundColor: colors.ink },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    minHeight: 64,
    paddingVertical: space(2.5),
    paddingHorizontal: space(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  listNum: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watch: { flexDirection: 'row', alignItems: 'center', gap: space(2), marginTop: space(1) },
  markerInline: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.ink },
});
