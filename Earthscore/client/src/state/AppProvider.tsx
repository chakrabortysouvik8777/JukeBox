// client/src/state/AppProvider.tsx
import React, { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { PlaybackState, PlaybackAction } from '../types/playback';
import { appReducer, initialPlaybackState } from './appReducer';
import { PlaybackController, PlaybackAudioEngine } from '../playback/PlaybackController';
import { AudioEngine } from '../audio/AudioEngine';

interface AppContextValue {
  state: PlaybackState;
  dispatch: React.Dispatch<PlaybackAction>;
  controller: PlaybackController | null;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export interface AppProviderProps {
  children: React.ReactNode;
  // Optional engine factory (tests can pass a fake engine).
  createAudioEngine?: () => PlaybackAudioEngine;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children, createAudioEngine }) => {
  const [state, dispatch] = useReducer(appReducer, initialPlaybackState);
  const [controller, setController] = useState<PlaybackController | null>(null);

  // Latest state for effects that must not re-run on every TICK.
  const stateRef = useRef(state);
  stateRef.current = state;

  // One engine + controller for the app's lifetime.
  // Created in an effect so React Strict Mode gets a fresh one after cleanup.
  useEffect(() => {
    const engine = createAudioEngine ? createAudioEngine() : new AudioEngine();
    const instance = new PlaybackController(engine, dispatch);
    setController(instance);

    return () => {
      instance.dispose();
      setController((current) => (current === instance ? null : current));
    };
  }, [createAudioEngine]);

  // (Re)schedule or halt the audio when playback changes.
  // TICK only changes dateIndex, so it never reaches this effect.
  useEffect(() => {
    if (!controller) return;

    if (state.status === 'playing') {
      void controller.play(stateRef.current);
    } else {
      controller.halt();
    }
  }, [controller, state.status, state.scheduleVersion]);

  // Volume and mute apply immediately, without rescheduling.
  useEffect(() => {
    controller?.applyVolume({ volume: state.volume, soundEnabled: state.soundEnabled });
  }, [controller, state.volume, state.soundEnabled]);

  return (
    <AppContext.Provider value={{ state, dispatch, controller }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppState = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
};
