import { StyleSheet, Text, View } from 'react-native';

import { colors, font, radius } from './theme';

/**
 * A part letter: blue round badge, white bold letter. Blue marks the parts a
 * step is about; `muted` is for parts the current step does not use.
 */
export function LetterBadge({ letter, size = 32, muted }: { letter: string; size?: number; muted?: boolean }) {
  return (
    <View
      style={[
        s.badge,
        { minWidth: size, height: size, borderRadius: radius.pill },
        muted ? { backgroundColor: colors.canvas, borderColor: colors.blue } : { backgroundColor: colors.blue, borderColor: colors.blue },
      ]}
      accessibilityLabel={`Part ${letter}`}
    >
      <Text style={{ fontFamily: font.bold, fontSize: Math.max(16, size * 0.55), color: muted ? colors.blue : colors.onDark }}>
        {letter}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, borderWidth: 1.5 },
});
