import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createElement, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { guideUrl, WEB_GUIDE_BY_ID, WEB_URL } from '@/data/webGuides';
import { useApp } from '@/store/useApp';
import { Button, Empty } from '@/ui/components';
import { colors, space, type } from '@/ui/theme';

type ProgressMsg =
  | { type: 'montera-progress'; product: string; name: string; step: number; total: number; finished: boolean }
  | { type: 'montera-home' };

/**
 * The build itself: the web app's phone layout (3D step player, parts, checks,
 * voice), full screen under a thin bar that goes back to this app's home.
 */
export default function GuideScreen() {
  useKeepAwake();
  const { id, step } = useLocalSearchParams<{ id: string; step?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const guide = WEB_GUIDE_BY_ID[id];
  const setWebProgress = useApp((st) => st.setWebProgress);
  const clearWebProgress = useApp((st) => st.clearWebProgress);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Resume where this build was left, unless a step was asked for. Fixed at mount:
  // later progress messages must not reload the page.
  const uri = useMemo(() => {
    const saved = useApp.getState().webProgress[id]?.step ?? 0;
    const asked = step ? Math.max(0, Number(step) - 1) : saved;
    return guideUrl(id, asked);
  }, [id, step]);

  if (!guide) {
    return (
      <View style={[s.fill, { paddingTop: insets.top + space(6), paddingHorizontal: space(4) }]}>
        <Empty icon="alert-circle-outline" title="Guide not found" body={`No web guide called “${id}”.`} />
        <Button label="Back to home" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: ProgressMsg;
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg?.type === 'montera-home') {
      leave();
      return;
    }
    if (msg?.type !== 'montera-progress' || msg.product !== id) return;
    if (msg.finished) clearWebProgress(id);
    else setWebProgress(id, { step: msg.step, total: msg.total, name: guide.name });
  };

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={s.fill}>
      {/* Only the status-bar gap: the guide's own top bar has Home (it posts `montera-home`), so there is one bar, not two. */}
      <View style={{ height: insets.top, backgroundColor: colors.canvas }} />

      {failed ? (
        <View style={[s.fill, { padding: space(4), gap: space(3) }]}>
          <Empty icon="cloud-offline-outline" title="Couldn’t load the guide" body={`Check the connection. The guide is served from ${WEB_URL}.`} />
          <Button
            label="Try again"
            icon="refresh"
            onPress={() => {
              setFailed(false);
              setLoading(true);
            }}
          />
        </View>
      ) : Platform.OS === 'web' ? (
        // react-native-webview has no web build; an iframe does the same job there.
        createElement('iframe', { src: uri, style: { flex: 1, border: 0, width: '100%' }, allow: 'microphone; autoplay' })
      ) : (
        <WebView
          source={{ uri }}
          style={s.fill}
          onMessage={onMessage}
          onLoadEnd={() => setLoading(false)}
          onError={() => setFailed(true)}
          // Voice: step clips play without a tap after the first one, the mic runs in the page.
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          // The page manages its own gestures (swipe between steps, orbit the 3D view).
          bounces={false}
          overScrollMode="never"
          allowsBackForwardNavigationGestures={false}
          setSupportMultipleWindows={false}
          javaScriptEnabled
          domStorageEnabled
        />
      )}

      {loading && !failed && Platform.OS !== 'web' && (
        <View style={s.loading} pointerEvents="none">
          <ActivityIndicator color={colors.ink} />
          <Text style={[type.body, { color: colors.textDim }]}>Opening {guide.name}…</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas },
  loading: { ...StyleSheet.absoluteFill, top: 80, alignItems: 'center', justifyContent: 'center', gap: space(2) },
});
