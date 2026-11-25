import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { colors, space, type } from './theme';

export function ScreenHeader({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(3),
        paddingHorizontal: space(4),
        paddingTop: space(2),
        paddingBottom: space(3),
      }}
    >
      {onBack && (
        <Pressable onPress={onBack} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[type.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[type.small, { color: colors.textFaint, marginTop: 2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}
