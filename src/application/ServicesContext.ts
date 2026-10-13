import { createContext } from 'react';
import type { ApplicationServices } from './ApplicationServices';

/** Providers must supply the actual composition root; missing wiring is an error. */
export const ServicesContext = createContext<ApplicationServices | null>(null);
