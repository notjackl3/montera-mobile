import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space, type } from './theme';

/**
 * Bottom sheet over the current screen. Flat: a scrim and a hairline, no
 * shadow. Used for the parts bag, the "which step went wrong" picker, build
 * settings and the voice wizard.
 */
export function Sheet({
  visible,
  onClose,
  title,
  onBack,
  children,
  tall,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Shows a back arrow instead of only the close button (for nested views). */
  onBack?: () => void;
  children: ReactNode;
  /** Take most of the screen (parts bag, calibration). */
  tall?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onBack ?? onClose}>
      <View style={s.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[s.panel, tall && { height: '88%' }, { paddingBottom: insets.bottom + space(3) }]}>
          <View style={s.head}>
            {onBack ? (
              <Pressable onPress={onBack} hitSlop={8} style={s.iconBtn} accessibilityLabel="Back">
                <Ionicons name="chevron-back" size={22} color={colors.ink} />
              </Pressable>
            ) : (
              <View style={{ width: 4 }} />
            )}
            <Text style={[type.title, { color: colors.text, flex: 1 }]} numberOfLines={2}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={8} style={s.iconBtn} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  panel: {
    maxHeight: '92%',
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: space(4),
    paddingTop: space(3),
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space(2), marginBottom: space(3) },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
