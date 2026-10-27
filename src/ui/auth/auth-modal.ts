import { authService, AuthUserProfile } from '../../services/auth-service';
import { showToast } from '../toast-notifier';

export class AuthModal {
  private container: HTMLElement;
  private activeTab: 'signin' | 'signup' = 'signin';
  private onAuthSuccessCallback?: (user: AuthUserProfile) => void;

  constructor(container: HTMLElement, onAuthSuccess?: (user: AuthUserProfile) => void) {
    this.container = container;
    this.onAuthSuccessCallback = onAuthSuccess;
    this.render();
    this.bindEvents();
  }

  public show(tab: 'signin' | 'signup' = 'signin') {
    this.activeTab = tab;
    this.render();
    this.bindEvents();
    this.container.style.display = 'flex';
  }

  public hide() {
    this.container.style.display = 'none';
  }

  private render() {
    const isSignIn = this.activeTab === 'signin';

    this.container.innerHTML = `
      <div class="auth-backdrop">
        <div class="auth-card" role="dialog" aria-labelledby="auth-title">
          <div class="auth-header">
            <div class="auth-brand">
              <span class="auth-logo-icon">🏛️</span>
              <span class="auth-logo-text">AuraBIM Studio</span>
            </div>
            <p class="auth-subtitle">Real-Time 2D CAD & 3D Spatial Interior Architecture</p>
            <div class="auth-tabs">
              <button class="auth-tab ${isSignIn ? 'active' : ''}" id="tab-signin">Sign In</button>
              <button class="auth-tab ${!isSignIn ? 'active' : ''}" id="tab-signup">Create Account</button>
            </div>
          </div>

          <form class="auth-form" id="auth-form">
            ${!isSignIn ? `
              <div class="auth-field">
                <label class="auth-label" for="auth-name">Your Full Name</label>
                <input type="text" id="auth-name" class="auth-input" placeholder="e.g. Alex Morgan" required autocomplete="name" />
              </div>
            ` : ''}

            <div class="auth-field">
              <label class="auth-label" for="auth-email">Email Address</label>
              <input type="email" id="auth-email" class="auth-input" placeholder="architect@aurabim.com" required autocomplete="email" />
            </div>

            <div class="auth-field">
              <label class="auth-label" for="auth-password">Password</label>
              <input type="password" id="auth-password" class="auth-input" placeholder="••••••••" required minlength="6" autocomplete="${isSignIn ? 'current-password' : 'new-password'}" />
            </div>

            <button type="submit" class="auth-submit-btn" id="btn-submit-auth">
              ${isSignIn ? 'Sign In to Workspace' : 'Create Account & Open Studio'}
            </button>
          </form>

          <div class="auth-divider">
            <span>or continue with</span>
          </div>

          <div class="auth-alt-actions">
            <button class="auth-google-btn" id="btn-google-auth">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <button class="auth-guest-btn" id="btn-guest-auth">
              <span>🚀 Explore as Guest (Instant 1-Click Access)</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents() {
    // Isolate pointer events
    ['pointerdown', 'mousedown', 'touchstart', 'click', 'dblclick', 'wheel'].forEach(evt => {
      this.container.addEventListener(evt, e => e.stopPropagation());
    });

    this.container.querySelector('#tab-signin')?.addEventListener('click', () => {
      this.activeTab = 'signin';
      this.render();
      this.bindEvents();
    });

    this.container.querySelector('#tab-signup')?.addEventListener('click', () => {
      this.activeTab = 'signup';
      this.render();
      this.bindEvents();
    });

    const form = this.container.querySelector('#auth-form') as HTMLFormElement | null;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (this.container.querySelector('#auth-email') as HTMLInputElement)?.value.trim();
      const password = (this.container.querySelector('#auth-password') as HTMLInputElement)?.value;
      const name = (this.container.querySelector('#auth-name') as HTMLInputElement)?.value?.trim();
      const submitBtn = this.container.querySelector('#btn-submit-auth') as HTMLButtonElement | null;

      if (!email || !password) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = this.activeTab === 'signin' ? 'Signing In...' : 'Creating Account...';
      }

      try {
        let user: AuthUserProfile;
        if (this.activeTab === 'signin') {
          user = await authService.signInWithEmail(email, password);
          showToast(`Welcome back, ${user.displayName || 'Designer'}!`);
        } else {
          user = await authService.signUpWithEmail(email, password, name);
          showToast(`Account created! Welcome, ${user.displayName}!`);
        }
        this.hide();
        this.onAuthSuccessCallback?.(user);
      } catch (err: any) {
        showToast(err.message || 'Authentication error', 4000);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = this.activeTab === 'signin' ? 'Sign In to Workspace' : 'Create Account & Open Studio';
        }
      }
    });

    this.container.querySelector('#btn-google-auth')?.addEventListener('click', async () => {
      try {
        const user = await authService.signInWithGoogle();
        showToast(`Signed in with Google as ${user.displayName}!`);
        this.hide();
        this.onAuthSuccessCallback?.(user);
      } catch (err: any) {
        showToast(err.message || 'Google Sign-in failed', 4000);
      }
    });

    this.container.querySelector('#btn-guest-auth')?.addEventListener('click', async () => {
      const user = await authService.signInAsGuest('Guest Architect');
      showToast('Entered as Guest Designer. Instant cloud/local saving active.');
      this.hide();
      this.onAuthSuccessCallback?.(user);
    });
  }
}
