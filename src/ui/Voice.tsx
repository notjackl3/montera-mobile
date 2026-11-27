import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  COMMANDS,
  COMMAND_ECHO,
  COMMAND_SCRIPT,
  PHASE_MS,
  parseHeard,
  shouldFailWake,
  voiceCaption,
  type VoiceCommand,
  type VoicePhase,
} from '@/engine/voice';
import { useApp } from '@/store/useApp';

import { Button, Chip, Row } from './components';
import { Sheet } from './Sheet';
import { colors, font, radius, space, type } from './theme';

/* ------------------------------------------------------------------ the hook */

type VoiceState = { phase: VoicePhase; heard?: string; command?: VoiceCommand };

/**
 * Drives the simulated "Hey IKEA" banner. The wizard calls `fire`; the banner
 * walks heard -> acting -> listening and runs the command in the middle, as if
 * the phone had understood. The planned failure step skips the chime and goes
 * straight to "not understood", so the participant has to use the buttons.
 */
export function useVoiceSim(step: number, run: (c: VoiceCommand) => void) {
  const failAtStep = useApp((st) => st.voice.failAtStep);
  const [state, setState] = useState<VoiceState>({ phase: 'listening' });
  const failed = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const runRef = useRef(run);
  runRef.current = run;
  const player = useAudioPlayer(require('../../assets/chime.wav'));

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const wake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // No audio (e.g. web before any gesture): the haptic and banner carry it.
    }
  };

  const fail = useCallback((heard?: string) => {
    reset();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setState({ phase: 'failed', heard });
    later(PHASE_MS.failed, () => setState({ phase: 'listening' }));
  }, []);

  const fire = useCallback(
    (command: VoiceCommand | undefined, heard?: string) => {
      reset();
      if (shouldFailWake({ failAtStep, step, failedAlready: failed.current })) {
        failed.current = true;
        fail(heard ?? (command ? COMMAND_SCRIPT[command] : undefined));
        return;
      }
      wake();
      const caption = heard ?? (command ? COMMAND_SCRIPT[command] : 'Hey IKEA');
      setState({ phase: 'heard', heard: caption });
      if (!command) {
        later(PHASE_MS.heard, () => fail(caption));
        return;
      }
      later(PHASE_MS.heard, () => {
        setState({ phase: 'acting', heard: caption, command });
        runRef.current(command);
        later(PHASE_MS.acting, () => setState({ phase: 'listening' }));
      });
    },
    [failAtStep, step, fail],
  );

  return { state, fire, fail };
}

/* ---------------------------------------------------------------- the banner */

function Waveform({ phase }: { phase: VoicePhase }) {
  const t = useRef(new Animated.Value(0)).current;
  const amp = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    const target = phase === 'heard' ? 1 : phase === 'acting' ? 0.55 : phase === 'failed' ? 0 : 0.25;
    Animated.timing(amp, { toValue: target, duration: 220, useNativeDriver: true }).start();
  }, [phase]);

  const color = phase === 'failed' ? colors.textFaint : colors.blue;
  return (
    <View style={s.wave} accessibilityElementsHidden>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const wobble = t.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [0.3, 1, 0.45, 0.85, 0.3].map((v, k) => (k % 2 === i % 2 ? v : 1.2 - v)),
        });
        return (
          <Animated.View
            key={i}
            style={[
              s.bar,
              {
                backgroundColor: color,
                transform: [{ scaleY: Animated.add(0.12, Animated.multiply(wobble, amp)) }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/**
 * Always-on "Hey IKEA" banner with four visible states. Long-press opens the
 * facilitator's wizard panel. Voice is never the only way: every command has a
 * large button on screen.
 */
export function VoiceBanner({ state, onLongPress }: { state: VoiceState; onLongPress: () => void }) {
  const tone =
    state.phase === 'failed'
      ? // Not red: red is reserved for open checks at Next (DESIGN.md).
        { bg: colors.surfaceAlt, border: colors.ink }
      : state.phase === 'listening'
        ? { bg: colors.canvas, border: colors.hairline }
        : { bg: colors.blueDim, border: colors.blue };
  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={600}
      style={[s.banner, { backgroundColor: tone.bg, borderColor: tone.border }]}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={voiceCaption(state.phase, state.heard, state.command)}
    >
      <Ionicons
        name={state.phase === 'failed' ? 'mic-off-outline' : 'mic'}
        size={20}
        color={state.phase === 'failed' ? colors.ink : colors.blue}
      />
      <Waveform phase={state.phase} />
      <Text
        style={[
          type.body,
          { flex: 1, color: colors.text },
          state.phase === 'acting' && { fontFamily: font.bold },
        ]}
        numberOfLines={2}
      >
        {voiceCaption(state.phase, state.heard, state.command)}
      </Text>
    </Pressable>
  );
}

/* ---------------------------------------------------------------- the wizard */

/**
 * Facilitator panel. Fires scripted commands so every session hears the same
 * words, or a free-text caption that is parsed like speech. "Fail the wake word
 * at step N" makes the not-understood state happen on purpose.
 */
export function WizardPanel({
  visible,
  onClose,
  stepCount,
  fire,
  fail,
}: {
  visible: boolean;
  onClose: () => void;
  stepCount: number;
  fire: (c: VoiceCommand | undefined, heard?: string) => void;
  fail: (heard?: string) => void;
}) {
  const [text, setText] = useState('');
  const send = (c: VoiceCommand | undefined, heard?: string) => {
    onClose();
    // Let the sheet slide away so the participant sees the banner react.
    setTimeout(() => fire(c, heard), 250);
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Voice wizard" tall>
      <View style={{ gap: space(3) }}>
        <Text style={[type.small, { color: colors.textDim }]}>Facilitator only. Fires a command as if it was heard.</Text>
        <View style={s.cmdGrid}>
          {COMMANDS.map((c) => (
            <Pressable key={c} onPress={() => send(c)} style={({ pressed }) => [s.cmd, pressed && { backgroundColor: colors.surfacePressed }]}>
              <Text style={[type.heading, { color: colors.text }]}>{COMMAND_ECHO[c]}</Text>
              <Text style={[type.small, { color: colors.textDim }]}>“{COMMAND_SCRIPT[c]}”</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              onClose();
              setTimeout(() => fail(), 250);
            }}
            style={({ pressed }) => [s.cmd, { borderStyle: 'dashed' }, pressed && { backgroundColor: colors.surfacePressed }]}
          >
            <Text style={[type.heading, { color: colors.text }]}>Not understood</Text>
            <Text style={[type.small, { color: colors.textDim }]}>Shows the fallback now</Text>
          </Pressable>
        </View>

        <Text style={[type.micro, { color: colors.textFaint }]}>HEARD (FREE TEXT)</Text>
        <Row gap={space(2)}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="What the participant said"
            placeholderTextColor={colors.textFaint}
            style={s.input}
            onSubmitEditing={() => text.trim() && send(parseHeard(text), text.trim())}
          />
          <Button label="Send" disabled={!text.trim()} onPress={() => send(parseHeard(text), text.trim())} />
        </Row>

        <FailAtStep stepCount={stepCount} />
      </View>
    </Sheet>
  );
}

/** "Fail the wake word at step N", shared by the wizard and the Study tab. */
export function FailAtStep({ stepCount }: { stepCount: number }) {
  const failAtStep = useApp((st) => st.voice.failAtStep);
  const setVoice = useApp((st) => st.setVoice);
  return (
    <View style={{ gap: space(2) }}>
      <Text style={[type.micro, { color: colors.textFaint }]}>FAIL THE WAKE WORD AT STEP</Text>
      <Row gap={space(2)} style={{ flexWrap: 'wrap' }}>
        <Chip label="Off" active={failAtStep === undefined} onPress={() => setVoice({ failAtStep: undefined })} />
        {Array.from({ length: stepCount }, (_, i) => i + 1).map((n) => (
          <Chip key={n} label={String(n)} active={failAtStep === n} onPress={() => setVoice({ failAtStep: n })} />
        ))}
      </Row>
      <Text style={[type.small, { color: colors.textDim }]}>
        The first voice command on that step shows “Didn’t catch that”, once per build.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
    minHeight: 52,
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
    borderRadius: radius.md,
    borderWidth: 1,
  },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 26, width: 46 },
  bar: { width: 3.5, height: 26, borderRadius: 2 },
  cmdGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  cmd: {
    width: '48.5%',
    minHeight: 72,
    padding: space(3),
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  input: {
    ...type.body,
    flex: 1,
    height: 56,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.inkSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space(4),
  },
});
