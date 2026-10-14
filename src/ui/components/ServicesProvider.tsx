import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { ApplicationServices } from '../../application/ApplicationServices';
import { ServicesContext } from '../../application/ServicesContext';

/** React authors the persistent audio element; the music player controls its playback. */
export function ServicesProvider({
  services,
  children,
}: {
  services: ApplicationServices;
  children: ReactNode;
}) {
  const musicRef = useRef<HTMLAudioElement>(null);
  const error = useSyncExternalStore(
    services.audio.subscribe,
    () => services.audio.error,
    () => null,
  );
  useEffect(() => {
    return services.display.attach();
  }, [services]);
  useEffect(() => {
    const element = musicRef.current;
    if (!element) throw new Error('The application requires its authored music element.');
    services.audio.music.attach(element);
    const unlock = () => services.audio.unlock();
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
    return () => {
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      services.audio.music.detach(element);
      services.audio.stopMatchSounds();
    };
  }, [services]);
  return (
    <ServicesContext.Provider value={services}>
      <audio ref={musicRef} src={services.audio.music.profile.url} loop preload="none" aria-hidden="true" />
      {children}
      {error && (
        <p role="status" className="audio-notice">
          {error}
        </p>
      )}
    </ServicesContext.Provider>
  );
}
