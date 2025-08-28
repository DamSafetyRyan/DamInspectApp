/**
 * Authentication Service
 * Handles user authentication, token management, and session persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { User } from '../../shared/types/auth';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

export class AuthService {
  /**
   * Authenticate user with username and password
   */
  async login(username: string, password: string): Promise<User> {
    try {
      // Mock authentication - in production, this would call your backend API
      if (username === 'demo' && password === 'demo') {
        const user: User = {
          id: '1',
          username: 'demo',
          email: 'demo@daminspect.com',
          role: 'inspector',
        };

        // Generate mock token
        const token = `mock_token_${Date.now()}`;
        
        // Store token securely
        await Keychain.setInternetCredentials(AUTH_TOKEN_KEY, username, token);
        
        // Store user data
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
        
        return user;
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user and clear stored credentials
   */
  async logout(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_DATA_KEY);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Get stored authentication token
   */
  async getToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(AUTH_TOKEN_KEY);
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      console.error('Get token error:', error);
      return null;
    }
  }

  /**
   * Get stored user data
   */
  async getUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getToken();
      const user = await this.getUser();
      return !!(token && user);
    } catch (error) {
      console.error('Is authenticated error:', error);
      return false;
    }
  }
}