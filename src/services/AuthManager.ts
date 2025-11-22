/**
 * AuthManager
 * Manages automatic authentication for the Clinical Extractor
 * Auto-registers/logs in a default user to enable seamless backend integration
 */

import BackendClient from './BackendClient';
import StatusManager from '../utils/status';

/**
 * Default demo user credentials (auto-created by backend on startup)
 * No configuration required - works out of the box!
 */
const DEFAULT_USER = {
  email: 'demo@example.com',
  password: 'demo123'
};

class AuthManager {
  private initialized = false;

  async ensureAuthenticated(): Promise<boolean> {
    if (this.initialized && BackendClient.isAuthenticated()) {
      return true;
    }

    // Check if backend is available first with retry (longer delays for startup)
    let backendAvailable = false;
    const maxAttempts = 3; // Reduced attempts for faster initial check
    const retryDelays = [100, 200, 300]; // Shorter delays for initial attempts
    
    console.log('🔐 Starting backend health checks...');
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`🔍 Health check attempt ${attempt + 1}/${maxAttempts}...`);
        backendAvailable = await BackendClient.healthCheck();
        console.log(`📊 Health check result: ${backendAvailable ? 'HEALTHY' : 'UNAVAILABLE'}`);
        
        if (backendAvailable) {
          console.log('✅ Backend is available and responding');
          break;
        } else {
          console.log(`⚠️ Backend not ready (attempt ${attempt + 1}/${maxAttempts})`);
        }
      } catch (err) {
        console.error(`❌ Health check attempt ${attempt + 1} threw error:`, err);
      }
      
      if (attempt < maxAttempts - 1) {
        console.log(`⏳ Retrying in ${retryDelays[attempt]}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      }
    }

    if (!backendAvailable) {
      console.log('ℹ️ Backend not available after multiple attempts - using frontend-only mode');
      this.initialized = true;
      return false;
    }

    console.log('🔐 Backend is healthy, attempting authentication...');

    try {
      if (!BackendClient.isAuthenticated()) {
        console.log('🔑 No existing auth token, attempting login...');
        try {
          console.log(`📧 Logging in as ${DEFAULT_USER.email}...`);
          await BackendClient.login(DEFAULT_USER.email, DEFAULT_USER.password);
          console.log('✅ Authenticated with backend');
        } catch (loginError: any) {
          console.log(`❌ Login failed: ${loginError.message} (status: ${loginError.status})`);
          
          // Prefer status code check, fallback to message if status is missing
          if ((loginError.status === 401) ||
              (loginError.response?.status === 401) ||
              (loginError.message && loginError.message.includes('Incorrect email or password'))) {
            console.log('🆕 User not found, attempting registration...');
            await BackendClient.register(DEFAULT_USER.email, DEFAULT_USER.password);
            console.log('✅ Registered and authenticated with backend');
          } else {
            console.error('❌ Unexpected login error:', loginError);
            throw loginError;
          }
        }
      } else {
        console.log('✅ Already authenticated (token exists)');
      }

      this.initialized = true;
      console.log('🎉 Authentication complete - backend mode active');
      return true;
    } catch (error: any) {
      console.error('❌ Backend authentication failed:', {
        message: error.message,
        status: error.status,
        stack: error.stack
      });
      console.warn('⚠️ Falling back to frontend-only mode');
      // Don't show error to user - app works fine without backend
      this.initialized = true;
      return false; // Backend auth failed, but app can still work
    }
  }

  async initialize(): Promise<void> {
    await this.ensureAuthenticated();
  }
}

export default new AuthManager();
