/**
 * AuraBIM Studio — Auth Page Template
 * Generates modern architectural split-screen markup aligned with DESIGN_SYSTEM.md
 */

import { ICONS } from '../icons';
import modernArchitectureUrl from '../../assets/auth/modern_architecture_exterior.png';

export const EYE_OPEN_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
export const EYE_OFF_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;

export interface AuthTemplateOptions {
  activeTab: 'signin' | 'signup';
  showPassword: boolean;
  currentTheme: string;
}

export function renderAuthMarkup(opts: AuthTemplateOptions): string {
  const isSignIn = opts.activeTab === 'signin';
  const isDark = opts.currentTheme === 'dark';

  return `
    <div class="auth-backdrop">
      <div class="auth-split-card" role="dialog" aria-labelledby="auth-title">
        
        <!-- Left Form Column -->
        <div class="auth-form-column">
          <!-- Top Brand & Utilities Bar -->
          <div class="auth-card-topbar">
            <div class="auth-brand-badge">
              <div class="auth-logo-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M3 21h18M5 21V7l8-4v18M13 21V3l6 3v15"/>
                  <line x1="9" y1="9" x2="9" y2="9.01"/><line x1="9" y1="13" x2="9" y2="13.01"/><line x1="9" y1="17" x2="9" y2="17.01"/>
                  <line x1="17" y1="9" x2="17" y2="9.01"/><line x1="17" y1="13" x2="17" y2="13.01"/><line x1="17" y1="17" x2="17" y2="17.01"/>
                </svg>
              </div>
              <span class="auth-logo-text">AuraBIM</span>
              <span class="auth-version-pill">STUDIO</span>
            </div>

            <div class="auth-top-actions">
              <button class="dash-theme-btn" id="btn-auth-theme" title="Switch Theme">
                ${isDark ? ICONS.themeSun : ICONS.themeMoon}
              </button>
              <button class="auth-close-btn" id="btn-close-auth" title="Dismiss modal">${ICONS.close}</button>
            </div>
          </div>

          <!-- Segmented Tab Switcher (Matching Dashboard CAD Controls) -->
          <div class="auth-segmented-switch">
            <button type="button" class="auth-seg-tab ${isSignIn ? 'active' : ''}" id="tab-auth-signin">
              Sign In
            </button>
            <button type="button" class="auth-seg-tab ${!isSignIn ? 'active' : ''}" id="tab-auth-signup">
              Create Account
            </button>
          </div>

          <!-- Section Heading -->
          <div class="auth-header">
            <h2 class="auth-title" id="auth-title">${isSignIn ? 'Welcome to AuraBIM' : 'Create Architect Account'}</h2>
            <p class="auth-subtitle">
              ${isSignIn ? 'Sign in to access your cloud-synchronized 2D & 3D projects.' : 'Start your 3D spatial interior design workstation today.'}
            </p>
          </div>

          <form class="auth-form" id="auth-form" novalidate>
            ${!isSignIn ? `
              <div class="auth-field">
                <div class="auth-label-row">
                  <label class="auth-label" for="auth-name">Full Name</label>
                  <span class="auth-field-error" id="err-auth-name"></span>
                </div>
                <input type="text" id="auth-name" class="auth-input" placeholder="e.g. Zaha Hadid" autocomplete="name" />
              </div>
            ` : ''}

            <div class="auth-field">
              <div class="auth-label-row">
                <label class="auth-label" for="auth-email">Architect Email</label>
                <span class="auth-field-error" id="err-auth-email"></span>
              </div>
              <input type="email" id="auth-email" class="auth-input" placeholder="architect@aurabim.com" autocomplete="email" />
            </div>

            <div class="auth-field">
              <div class="auth-label-row">
                <label class="auth-label" for="auth-password">Password</label>
                <span class="auth-field-error" id="err-auth-password"></span>
              </div>
              <div class="auth-input-wrapper">
                <input
                  type="${opts.showPassword ? 'text' : 'password'}"
                  id="auth-password"
                  class="auth-input has-toggle"
                  placeholder="••••••••"
                  autocomplete="${isSignIn ? 'current-password' : 'new-password'}"
                />
                <button type="button" class="auth-password-toggle" id="btn-toggle-password" title="Toggle password visibility" aria-label="Toggle password visibility">
                  ${opts.showPassword ? EYE_OFF_SVG : EYE_OPEN_SVG}
                </button>
              </div>
            </div>

            ${isSignIn ? `
              <div class="auth-options-row">
                <label class="auth-remember-label">
                  <input type="checkbox" id="auth-remember" class="auth-checkbox" checked />
                  <span>Remember on this device</span>
                </label>
                <button type="button" class="auth-forgot-btn" id="btn-forgot-password">Forgot password</button>
              </div>
            ` : ''}

            <button type="submit" class="auth-submit-btn" id="btn-submit-auth">
              <span>${isSignIn ? 'Sign In to Studio' : 'Create Free Account'}</span>
            </button>
          </form>

          <div class="auth-footer-prompt">
            <span>${isSignIn ? "Need a new workspace?" : "Already registered?"}</span>
            <button type="button" class="auth-link-btn" id="btn-switch-mode">
              ${isSignIn ? 'Create an account' : 'Sign in'}
            </button>
          </div>

          <div class="auth-guest-row">
            <button type="button" class="auth-guest-link" id="btn-guest-auth">
              Continue as Guest Architect →
            </button>
          </div>

          <!-- Bottom Cloud Telemetry Status -->
          <div class="auth-cloud-status">
            <span class="auth-cloud-dot"></span>
            <span class="auth-cloud-text">Cloud Sync: <strong>CARVAZON3D · UYD1VCNG</strong></span>
          </div>
        </div>

        <!-- Right Architectural Picture Column -->
        <div class="auth-art-column">
          <div class="auth-art-wrapper">
            <img src="${modernArchitectureUrl}" alt="AuraBIM Modern Architectural Facade" class="auth-art-image" />
          </div>
        </div>

      </div>
    </div>
  `;
}
