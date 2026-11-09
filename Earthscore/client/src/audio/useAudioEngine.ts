import { useEffect, useRef } from "react";

import { AudioEngine } from "./AudioEngine";

/**
 * Creates one AudioEngine for the lifetime of the component and
 * disposes it on unmount.
 *
 * Safe with React Strict Mode: if React runs cleanup and setup again,
 * a fresh engine is created instead of reusing a disposed one.
 *
 * Read the engine with engineRef.current inside event handlers.
 */
export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    const engine = new AudioEngine();
    engineRef.current = engine;

    return () => {
      engine.dispose();

      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, []);

  return engineRef;
}