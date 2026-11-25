import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, radius, space, type } from './theme';

export function Card({
  children,
  style,
  onPress,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}) {
  const body = (
    <View style={[s.card, padded && { padding: space(4) }, style]}>{children}</View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.75, transform: [{ scale: 0.99 }] }}>
      {body}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary: { bg: colors.blue, fg: colors.onDark, border: colors.blue },
    secondary: { bg: colors.canvas, fg: colors.ink, border: colors.ink },
    ghost: { bg: 'transparent', fg: colors.textDim, border: colors.border },
    danger: { bg: colors.canvas, fg: colors.danger, border: colors.danger },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: palette.bg, borderColor: palette.border },
        (disabled || loading) && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={palette.fg} />}
          <Text style={[type.heading, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  tone = 'neutral',
  icon,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  tone?: 'neutral' | 'accent' | 'blue' | 'success' | 'warn' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const tones = {
    neutral: { bg: colors.surfaceAlt, fg: colors.textDim, border: colors.border },
    // Yellow fill with ink text — yellow never carries coloured text.
    accent: { bg: colors.accent, fg: colors.ink, border: colors.accent },
    blue: { bg: colors.blueDim, fg: colors.blue, border: colors.blue },
    success: { bg: colors.successDim, fg: colors.success, border: colors.success },
    warn: { bg: colors.warnDim, fg: colors.warn, border: colors.warn },
    danger: { bg: colors.dangerDim, fg: colors.danger, border: colors.danger },
  };
  const t = active ? { bg: colors.ink, fg: colors.canvas, border: colors.ink } : tones[tone];
  const Wrapper: typeof Pressable | typeof View = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      style={[s.chip, { backgroundColor: t.bg, borderColor: t.border }]}
    >
      {icon && <Ionicons name={icon} size={13} color={t.fg} />}
      <Text style={[type.small, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Wrapper>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.sectionHeader}>
      <Text style={[type.micro, { color: colors.textFaint, textTransform: 'uppercase' }]}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          {/* Blue, not yellow: DESIGN.md forbids yellow carrying text on white. */}
          <Text style={[type.small, { color: colors.blue }]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function ProgressBar({ value, tone = colors.blue, height = 6 }: { value: number; tone?: string; height?: number }) {
  return (
    <View style={[s.track, { height, borderRadius: height / 2 }]}>
      <View
        style={{
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: tone,
        }}
      />
    </View>
  );
}

export function Difficulty({ level, size = 6 }: { level: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: i <= level ? colors.ink : colors.border,
          }}
        />
      ))}
    </View>
  );
}

export function StatTile({
  value,
  label,
  tone = colors.text,
  style,
}: {
  value: string;
  label: string;
  tone?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[s.stat, style]}>
      <Text style={[type.title, { color: tone }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {/* Two lines: three tiles across at phone width is not enough room for
          labels like "Footprint cm" or "Your time" on one. */}
      <Text style={[type.micro, { color: colors.textFaint, textTransform: 'uppercase' }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function Row({
  children,
  gap = space(2),
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Meta({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.small, { color: colors.textDim }, style]}>{children}</Text>;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

export function Empty({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={34} color={colors.textFaint} />
      <Text style={[type.heading, { color: colors.text, marginTop: space(3) }]}>{title}</Text>
      <Text style={[type.small, { color: colors.textFaint, textAlign: 'center', marginTop: space(1.5) }]}>{body}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
    height: 56,
    paddingHorizontal: space(5),
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    paddingHorizontal: space(2.5),
    paddingVertical: space(1.5),
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space(2.5),
  },
  track: { backgroundColor: colors.border, overflow: 'hidden', width: '100%' },
  stat: {
    flex: 1,
    gap: space(1),
    paddingVertical: space(3),
    paddingHorizontal: space(3),
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  empty: { alignItems: 'center', paddingVertical: space(12), paddingHorizontal: space(8) },
});
