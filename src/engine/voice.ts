/**
 * Simulated "Hey IKEA" voice, for a Wizard-of-Oz study.
 *
 * There is no speech recognition. A facilitator fires commands from the wizard
 * panel (or types what the participant said), and the build screen plays the
 * banner through heard -> acting -> listening exactly as if it had heard them.
 * A planned wake-word failure at one step tests the fallback on purpose, so
 * every session hits it at the same point and sessions stay comparable.
 */

export type VoiceCommand = 'next' | 'back' | 'repeat' | 'undo' | 'parts';

export type VoicePhase = 'listening' | 'heard' | 'acting' | 'failed';

export const COMMAND_ECHO: Record<VoiceCommand, string> = {
  next: 'Next step',
  back: 'Previous step',
  repeat: 'Showing this step again',
  undo: 'Something’s wrong: which step?',
  parts: 'Opening the parts bag',
};

/** What the participant is scripted to say for each command. */
export const COMMAND_SCRIPT: Record<VoiceCommand, string> = {
  next: 'Hey IKEA, next step',
  back: 'Hey IKEA, go back',
  repeat: 'Hey IKEA, say that again',
  undo: 'Hey IKEA, I made a mistake',
  parts: 'Hey IKEA, show me the parts',
};

export const COMMANDS: VoiceCommand[] = ['next', 'back', 'repeat', 'undo', 'parts'];

/** Map a typed "heard" caption to a command, roughly the way a real parser would. */
export function parseHeard(text: string): VoiceCommand | undefined {
  const t = text.toLowerCase();
  if (/\b(mistake|wrong|undo|take (it )?apart)\b/.test(t)) return 'undo';
  if (/\b(part|parts|screw|screws|bag|which one)\b/.test(t)) return 'parts';
  if (/\b(again|repeat|what|pardon)\b/.test(t)) return 'repeat';
  if (/\b(back|previous|before)\b/.test(t)) return 'back';
  if (/\b(next|done|finished|forward|ok(ay)?|continue)\b/.test(t)) return 'next';
  return undefined;
}

export type WakeInput = {
  /** 1-based step to fail on, as the facilitator configured it. */
  failAtStep?: number;
  /** 0-based step on screen. */
  step: number;
  /** The planned failure already happened this session. */
  failedAlready: boolean;
};

/** The planned failure fires once, on the first wake at that step. */
export const shouldFailWake = ({ failAtStep, step, failedAlready }: WakeInput) =>
  failAtStep !== undefined && !failedAlready && step + 1 === failAtStep;

/** Banner copy for each phase. */
export function voiceCaption(phase: VoicePhase, heard?: string, command?: VoiceCommand): string {
  switch (phase) {
    case 'listening':
      return 'Say “Hey IKEA, next step”';
    case 'heard':
      return heard ? `“${heard}”` : 'Listening…';
    case 'acting':
      return command ? COMMAND_ECHO[command] : 'Done';
    case 'failed':
      return 'Didn’t catch that. Tap Next or try again';
  }
}

/** How long each phase stays on screen, in ms. */
export const PHASE_MS = { heard: 900, acting: 1400, failed: 3200 } as const;
