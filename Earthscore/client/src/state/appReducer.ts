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
};

export function appReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'PLAY':
      if (state.events.length === 0) return state;
      return { ...state, status: 'playing' };

    case 'PAUSE':
      return { ...state, status: 'paused' };

    case 'STOP':
      return { ...state, status: 'stopped', dateIndex: 0, activeSlot: 'A' };

    case 'SEEK': {
      const maxIdx = Math.max(0, state.events.length - 1);
      const targetIdx = Math.min(Math.max(0, action.payload.index), maxIdx);
      const targetEvent = state.events[targetIdx];
      return {
        ...state,
        dateIndex: targetIdx,
        activeSlot: targetEvent ? targetEvent.slot : 'A',
      };
    }

    case 'SET_SPEED': {
      const speed = Math.min(
        Math.max(action.payload.speed, PLAYBACK_DEFAULTS.minSpeed),
        PLAYBACK_DEFAULTS.maxSpeed
      );
      return { ...state, playbackSpeed: speed };
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

    case 'SET_EVENTS':
      return {
        ...state,
        events: action.payload.events,
        dateIndex: 0,
        activeSlot: 'A',
      };

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

    default:
      return state;
  }
}