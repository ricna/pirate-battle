import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { LocalStorageStore } from '../infrastructure/storage/LocalStorageStore';
import { NetworkSimulator } from '../infrastructure/network/NetworkSimulator';
import { RecordsApi } from '../infrastructure/network/RecordsApi';
import { OptionsRepository } from './configuration/OptionsRepository';
import { MatchRepository } from './records/MatchRepository';
import { PlayerIdentityRepository } from './records/PlayerIdentityRepository';
import { AudioManager } from '../game/audio/AudioManager';
import { SoundEffectPlayer } from '../game/audio/SoundEffectPlayer';
import { MusicPlayer } from '../game/audio/MusicPlayer';
import { AudioConfig } from '../game/configuration/AudioConfig';
import type { GameTextureLibrary } from '../game/assets/GameTextureLibrary';

/** Composition root: creates application services once, never a global service locator. */
export class ApplicationServices {
  readonly #storage = new LocalStorageStore('pirate');
  readonly #options = new OptionsRepository(this.#storage);
  readonly #matches = new MatchRepository(this.#storage);
  readonly #player = new PlayerIdentityRepository(this.#storage);
  readonly #network = new NetworkSimulator(this.#storage);
  readonly #records = new RecordsApi(axios.create({ baseURL: '/api', timeout: 1800 }));
  readonly #queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 0, refetchOnWindowFocus: false, refetchOnMount: 'always' },
      mutations: { retry: false },
    },
  });
  #textureLibrary: Promise<GameTextureLibrary> | null = null;
  readonly #audio = new AudioManager(
    new SoundEffectPlayer(),
    new MusicPlayer(AudioConfig.Music),
    this.#options.load(),
  );

  get storage(): LocalStorageStore {
    return this.#storage;
  }
  get options(): OptionsRepository {
    return this.#options;
  }
  get matches(): MatchRepository {
    return this.#matches;
  }
  get player(): PlayerIdentityRepository {
    return this.#player;
  }
  get network(): NetworkSimulator {
    return this.#network;
  }
  get records(): RecordsApi {
    return this.#records;
  }
  get queryClient(): QueryClient {
    return this.#queryClient;
  }
  get audio(): AudioManager {
    return this.#audio;
  }
  loadTextureLibrary(): Promise<GameTextureLibrary> {
    this.#textureLibrary ??= import('../game/assets/GameTextureLibrary')
      .then(({ GameTextureLibrary }) => new GameTextureLibrary())
      .catch((error: unknown) => {
        this.#textureLibrary = null;
        throw error;
      });
    return this.#textureLibrary;
  }
}
