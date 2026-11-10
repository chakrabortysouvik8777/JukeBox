import { PlaybackState, PlaybackAction } from '../types/playback';

export interface AudioEngineInterface {
  playTone(frequencyHz: number, durationSec: number, volume: number): void;
  stopAll(): void;
}

export class PlaybackController {
  private timerId: number | null = null;
  private dispatch: React.Dispatch<PlaybackAction>;
  private audioEngine?: AudioEngineInterface;

  constructor(dispatch: React.Dispatch<PlaybackAction>, audioEngine?: AudioEngineInterface) {
    this.dispatch = dispatch;
    this.audioEngine = audioEngine;
  }

  public syncWithState(state: PlaybackState): void {
    if (state.status === 'playing') {
      this.ensureRunning(state);
    } else {
      this.stopTimer();
      if (state.status === 'stopped' || state.status === 'paused') {
        this.audioEngine?.stopAll();
      }
    }
  }

  private ensureRunning(state: PlaybackState): void {
    if (this.timerId !== null) return;

    const intervalMs = (state.secondsPerEvent * 1000) / state.playbackSpeed;

    this.timerId = window.setInterval(() => {
      this.dispatch({ type: 'STEP_NEXT' });
    }, intervalMs);
  }

  public triggerCurrentAudio(state: PlaybackState): void {
    if (!state.soundEnabled || state.events.length === 0) return;

    const currentEvent = state.events[state.dateIndex];
    if (currentEvent && currentEvent.audioFrequencyHz !== null) {
      const noteDuration = (state.secondsPerEvent * 0.8) / state.playbackSpeed;
      this.audioEngine?.playTone(currentEvent.audioFrequencyHz, noteDuration, state.volume);
    }
  }

  public handleSeek(index: number): void {
    this.audioEngine?.stopAll();
    this.dispatch({ type: 'SEEK', payload: { index } });
  }

  public stopTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public dispose(): void {
    this.stopTimer();
    this.audioEngine?.stopAll();
  }
}