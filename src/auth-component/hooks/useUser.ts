import type { User } from '../types';
import { useAuth } from './useAuth';

export function useUser(): User {
  return useAuth().user;
}
