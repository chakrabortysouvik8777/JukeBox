import { PlaybackState, PlaybackAction } from '../types/playback';
import { PLAYBACK_DEFAULTS } from '../config/defaults';

export const initialPlaybackState: PlaybackState = {
  status: 'idle',
  dateIndex: 0,
  selectedRegionId: 'global',
  comparisonRegionId: null,
  activeSlot: 'A',
  secondsPerEvent: PLAYBACK_DEFAULTS.secondsPerEvent,
  playbackSpeed: PLAYBACK_DEFAULTS.initialSpeed,
  soundEnabled: PLAYBACK_DEFAULTS.soundEnabled,
  volume: PLAYBACK_DEFAULTS.defaultVolume,
  events: [],
  rangeStartIndex: 0,
  playUntilIndex: null,
  scheduleVersion: 0,
  error: null,
};

function clampIndex(state: PlaybackState, index: number): number {
  const maxIdx = Math.max(0, state.events.length - 1);
  return Math.min(Math.max(0, Math.round(index)), maxIdx);
}

/** Last index of the current play range. */
export function rangeEndIndex(state: PlaybackState): number {
  const last = Math.max(0, state.events.length - 1);
  return state.playUntilIndex === null ? last : Math.min(state.playUntilIndex, last);
}

export function appReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'PLAY': {
      if (state.events.length === 0) return state;

      // Resume a paused range as it was.
      if (state.status === 'paused') {
        return {
          ...state,
          status: 'playing',
          error: null,
          scheduleVersion: state.scheduleVersion + 1,
        };
      }

      // Otherwise play the whole timeline from the current position,
      // or from the beginning if we are already at the last month.
      const lastIdx = state.events.length - 1;
      const start = state.dateIndex >= lastIdx ? 0 : state.dateIndex;

      return {
        ...state,
        status: 'playing',
        dateIndex: start,
        rangeStartIndex: start,
        playUntilIndex: null,
        error: null,
        scheduleVersion: state.scheduleVersion + 1,
      };
    }

    case 'PLAY_RANGE': {
      if (state.events.length === 0) return state;
      const start = clampIndex(state, action.payload.startIndex);
      const end = Math.max(start, clampIndex(state, action.payload.endIndex));

      return {
        ...state,
        status: 'playing',
        dateIndex: start,
        activeSlot: state.events[start]?.slot ?? 'A',
        rangeStartIndex: start,
        playUntilIndex: end,
        error: null,
        scheduleVersion: state.scheduleVersion + 1,
      };
    }

    case 'PAUSE':
      if (state.status !== 'playing') return state;
      return { ...state, status: 'paused' };

    case 'STOP':
      // Stop the sound and go back to the start of the range that was playing.
      return {
        ...state,
        status: 'stopped',
        dateIndex: clampIndex(state, state.rangeStartIndex),
        activeSlot: 'A',
      };

    case 'SEEK': {
      const targetIdx = clampIndex(state, action.payload.index);
      const targetEvent = state.events[targetIdx];
      const playing = state.status === 'playing';

      return {
        ...state,
        dateIndex: targetIdx,
        activeSlot: targetEvent ? targetEvent.slot : 'A',
        // A seek always ends a one-year range (playing, paused or stopped):
        // from the new position the whole timeline plays on. This prevents
        // resuming a paused year range from a month outside that year.
        rangeStartIndex: targetIdx,
        playUntilIndex: null,
        scheduleVersion: playing ? state.scheduleVersion + 1 : state.scheduleVersion,
      };
    }

    case 'SET_SPEED': {
      const speed = Math.min(
        Math.max(action.payload.speed, PLAYBACK_DEFAULTS.minSpeed),
        PLAYBACK_DEFAULTS.maxSpeed
      );
      const playing = state.status === 'playing';
      return {
        ...state,
        playbackSpeed: speed,
        scheduleVersion: playing ? state.scheduleVersion + 1 : state.scheduleVersion,
      };
    }

    case 'SET_VOLUME': {
      const volume = Math.min(Math.max(action.payload.volume, 0), 1);
      return { ...state, volume };
    }

    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };

    case 'SELECT_REGION':
      return {
        ...state,
        selectedRegionId: action.payload.regionId,
        dateIndex: 0,
        status: 'idle',
      };

    case 'SET_COMPARISON_REGION':
      return {
        ...state,
        comparisonRegionId: action.payload.regionId,
        dateIndex: 0,
        status: 'idle',
      };

    case 'SET_EVENTS': {
      // New data (e.g. another location): stop playback, keep the position if asked.
      const events = action.payload.events;
      const maxIdx = Math.max(0, events.length - 1);
      const start = Math.min(Math.max(0, action.payload.startIndex ?? 0), maxIdx);

      return {
        ...state,
        events,
        status: state.status === 'playing' || state.status === 'paused' ? 'stopped' : state.status,
        dateIndex: start,
        activeSlot: 'A',
        rangeStartIndex: start,
        playUntilIndex: null,
        scheduleVersion: state.scheduleVersion + 1,
      };
    }

    case 'STEP_NEXT': {
      if (state.events.length === 0) return state;
      const nextIdx = (state.dateIndex + 1) % state.events.length;
      return {
        ...state,
        dateIndex: nextIdx,
        activeSlot: state.events[nextIdx]?.slot ?? 'A',
      };
    }

    case 'STEP_PREV': {
      if (state.events.length === 0) return state;
      const prevIdx = (state.dateIndex - 1 + state.events.length) % state.events.length;
      return {
        ...state,
        dateIndex: prevIdx,
        activeSlot: state.events[prevIdx]?.slot ?? 'A',
      };
    }

    case 'TICK': {
      // Position reported by the audio clock. Never reschedules audio.
      if (state.status !== 'playing') return state;
      const idx = clampIndex(state, action.payload.index);
      if (idx === state.dateIndex) return state;
      return {
        ...state,
        dateIndex: idx,
        activeSlot: state.events[idx]?.slot ?? 'A',
      };
    }

    case 'ENDED':
      if (state.status !== 'playing') return state;
      return { ...state, status: 'stopped', dateIndex: rangeEndIndex(state) };

    case 'PLAYBACK_ERROR':
      return { ...state, status: 'stopped', error: action.payload.message };

    default:
      return state;
  }
}
