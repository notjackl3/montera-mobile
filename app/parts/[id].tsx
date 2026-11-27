import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getProduct } from '@/data/products';
import { Empty } from '@/ui/components';
import { PartsBag } from '@/ui/PartsBag';
import { colors, space } from '@/ui/theme';

/** The parts bag as its own screen, for the hardware scanner and the product page. */
export default function PartsScreen() {
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const product = getProduct(id);

  if (!product) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space(10) }}>
        <Empty icon="alert-circle-outline" title="Product not found" body="That id is not in the seeded catalogue." />
      </View>
    );
  }
  return <PartsBag product={product} focus={focus} onClose={() => router.back()} asScreen />;
}
