import { createContext } from 'react';
import type { FujuClient } from '../api/client';

export const FujuClientContext = createContext<FujuClient | null>(null);
