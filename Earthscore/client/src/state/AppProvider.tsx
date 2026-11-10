// client/src/state/AppProvider.tsx
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { PlaybackState, PlaybackAction } from '../types/playback';
import { appReducer, initialPlaybackState } from './appReducer';
import { PlaybackController, AudioEngineInterface } from '../playback/PlaybackController';

interface AppContextValue {
  state: PlaybackState;
  dispatch: React.Dispatch<PlaybackAction>;
  controller: PlaybackController | null;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export interface AppProviderProps {
  children: React.ReactNode;
  audioEngine?: AudioEngineInterface;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children, audioEngine }) => {
  const [state, dispatch] = useReducer(appReducer, initialPlaybackState);
  const controllerRef = useRef<PlaybackController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = new PlaybackController(dispatch, audioEngine);
  }

  useEffect(() => {
    const controller = controllerRef.current;
    if (controller) {
      controller.syncWithState(state);
      if (state.status === 'playing') {
        controller.triggerCurrentAudio(state);
      }
    }
  }, [state, audioEngine]);

  useEffect(() => {
    return () => {
      controllerRef.current?.dispose();
    };
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, controller: controllerRef.current }}>
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