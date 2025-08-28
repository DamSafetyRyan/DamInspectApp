/**
 * Authentication-related type definitions
 */

export interface User {
  id: string;
  username: string;
  email?: string;
  role?: string;
}

export interface AuthContextType {
  state: {
    user: User | null;
    isLoading: boolean;
    error: string | null;
  };
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}