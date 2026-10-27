import { authService, AuthUserProfile } from '../../services/auth-service';
import { showToast } from '../toast-notifier';
import { isCloudConnected } from '../../services/firebase-config';
import { customPrompt } from '../custom-dialog';

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
    const emailInput = this.container.querySelector('#auth-email') as HTMLInputElement | null;
    emailInput?.focus();
  }

  public hide() {
    this.container.style.display = 'none';
  }

  private render() {
    const isSignIn = this.activeTab === 'signin';

    this.container.innerHTML = `
      <div class="auth-backdrop">
        <div class="auth-card" role="dialog" aria-labelledby="auth-title">
          <button class="auth-close-btn" id="btn-close-auth" title="Dismiss modal">✕</button>

          <div class="auth-header">
            <div class="auth-brand">
              <span class="auth-logo-icon">🏛️</span>
              <span class="auth-logo-text" id="auth-title">AuraBIM Studio</span>
            </div>
            <p class="auth-subtitle">Real-Time 2D CAD & 3D Spatial Interior Architecture</p>
            <div class="auth-tabs" role="tablist">
              <button class="auth-tab ${isSignIn ? 'active' : ''}" id="tab-signin" role="tab" aria-selected="${isSignIn}">Sign In</button>
              <button class="auth-tab ${!isSignIn ? 'active' : ''}" id="tab-signup" role="tab" aria-selected="${!isSignIn}">Create Account</button>
            </div>
          </div>

          <form class="auth-form" id="auth-form" novalidate>
            ${!isSignIn ? `
              <div class="auth-field">
                <div class="auth-label-row">
                  <label class="auth-label" for="auth-name">Your Full Name</label>
                  <span class="auth-field-error" id="err-auth-name"></span>
                </div>
                <input type="text" id="auth-name" class="auth-input" placeholder="e.g. Alex Morgan" autocomplete="name" />
              </div>
            ` : ''}

            <div class="auth-field">
              <div class="auth-label-row">
                <label class="auth-label" for="auth-email">Email Address</label>
                <span class="auth-field-error" id="err-auth-email"></span>
              </div>
              <input type="email" id="auth-email" class="auth-input" placeholder="architect@aurabim.com" autocomplete="email" />
            </div>

            <div class="auth-field">
              <div class="auth-label-row">
                <label class="auth-label" for="auth-password">Password</label>
                <span class="auth-field-error" id="err-auth-password"></span>
              </div>
              <input type="password" id="auth-password" class="auth-input" placeholder="••••••••" autocomplete="${isSignIn ? 'current-password' : 'new-password'}" />
            </div>

            <button type="submit" class="auth-submit-btn" id="btn-submit-auth">
              <span>${isSignIn ? 'Sign In to Workspace' : 'Create Account & Open Studio'}</span>
              <span>→</span>
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
              <span>🚀 Continue as Guest Designer (1-Click Instant)</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents() {
    // Pointer Event Isolation
    ['pointerdown', 'mousedown', 'touchstart', 'click', 'dblclick'].forEach(evt => {
      this.container.addEventListener(evt, e => e.stopPropagation());
    });

    this.container.querySelector('#btn-close-auth')?.addEventListener('click', () => this.hide());

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
      const emailInput = this.container.querySelector('#auth-email') as HTMLInputElement | null;
      const passInput = this.container.querySelector('#auth-password') as HTMLInputElement | null;
      const nameInput = this.container.querySelector('#auth-name') as HTMLInputElement | null;
      const errEmail = this.container.querySelector('#err-auth-email');
      const errPass = this.container.querySelector('#err-auth-password');
      const errName = this.container.querySelector('#err-auth-name');

      if (errEmail) errEmail.textContent = '';
      if (errPass) errPass.textContent = '';
      if (errName) errName.textContent = '';
      emailInput?.classList.remove('has-error');
      passInput?.classList.remove('has-error');
      nameInput?.classList.remove('has-error');

      const email = emailInput?.value.trim() || '';
      const password = passInput?.value || '';
      const name = nameInput?.value?.trim() || '';

      // Client validation
      let hasError = false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        if (errEmail) errEmail.textContent = 'Valid email required';
        emailInput?.classList.add('has-error');
        hasError = true;
      }

      if (password.length < 6) {
        if (errPass) errPass.textContent = 'Min 6 characters';
        passInput?.classList.add('has-error');
        hasError = true;
      }

      if (this.activeTab === 'signup' && !name) {
        if (errName) errName.textContent = 'Name required';
        nameInput?.classList.add('has-error');
        hasError = true;
      }

      if (hasError) return;

      const submitBtn = this.container.querySelector('#btn-submit-auth') as HTMLButtonElement | null;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>${this.activeTab === 'signin' ? 'Signing In...' : 'Creating Account...'}</span>`;
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
          submitBtn.innerHTML = `<span>${this.activeTab === 'signin' ? 'Sign In to Workspace' : 'Create Account & Open Studio'}</span><span>→</span>`;
        }
      }
    });

    this.container.querySelector('#btn-google-auth')?.addEventListener('click', async () => {
      try {
        if (!isCloudConnected) {
          const googleEmail = await customPrompt(
            'Sign in with Google',
            'Enter your Google account email to connect to AuraBIM Studio:',
            'architect@gmail.com',
            { placeholder: 'yourname@gmail.com', confirmText: 'Sign in with Google' }
          );
          if (!googleEmail || !googleEmail.trim()) {
            return;
          }
          const user = await authService.signInWithGoogle(googleEmail.trim());
          showToast(`Signed in with Google as ${user.displayName}!`);
          this.hide();
          this.onAuthSuccessCallback?.(user);
          return;
        }

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
      showToast('Entered as Guest Designer. Cloud/Local auto-save ready.');
      this.hide();
      this.onAuthSuccessCallback?.(user);
    });
  }
}
