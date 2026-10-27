import { authService, AuthUserProfile } from '../../services/auth-service';
import { showToast } from '../toast-notifier';
import { customPrompt, customAlert } from '../custom-dialog';
import { ICONS } from '../icons';
import flutedGlassUrl from '../../assets/auth/fluted_glass_texture.jpg';

const EYE_OPEN_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;

export class AuthModal {
  private container: HTMLElement;
  private activeTab: 'signin' | 'signup' = 'signin';
  private showPassword = false;
  private onAuthSuccessCallback?: (user: AuthUserProfile) => void;

  constructor(container: HTMLElement, onAuthSuccess?: (user: AuthUserProfile) => void) {
    this.container = container;
    this.onAuthSuccessCallback = onAuthSuccess;
    this.render();
    this.bindEvents();
  }

  public show(tab: 'signin' | 'signup' = 'signin') {
    this.activeTab = tab;
    this.showPassword = false;
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
        <div class="auth-split-card" role="dialog" aria-labelledby="auth-title">
          <button class="auth-close-btn" id="btn-close-auth" title="Dismiss modal">${ICONS.close}</button>

          <!-- Left Form Column -->
          <div class="auth-form-column">
            <div class="auth-header">
              <h2 class="auth-title" id="auth-title">${isSignIn ? 'Welcome back' : 'Create an account'}</h2>
              <p class="auth-subtitle">
                ${isSignIn ? 'Welcome back! Please enter your details.' : 'Start your 3D spatial interior design journey today.'}
              </p>
            </div>

            <form class="auth-form" id="auth-form" novalidate>
              ${!isSignIn ? `
                <div class="auth-field">
                  <div class="auth-label-row">
                    <label class="auth-label" for="auth-name">Name</label>
                    <span class="auth-field-error" id="err-auth-name"></span>
                  </div>
                  <input type="text" id="auth-name" class="auth-input" placeholder="Enter your full name" autocomplete="name" />
                </div>
              ` : ''}

              <div class="auth-field">
                <div class="auth-label-row">
                  <label class="auth-label" for="auth-email">Email</label>
                  <span class="auth-field-error" id="err-auth-email"></span>
                </div>
                <input type="email" id="auth-email" class="auth-input" placeholder="Enter your email" autocomplete="email" />
              </div>

              <div class="auth-field">
                <div class="auth-label-row">
                  <label class="auth-label" for="auth-password">Password</label>
                  <span class="auth-field-error" id="err-auth-password"></span>
                </div>
                <div class="auth-input-wrapper">
                  <input
                    type="${this.showPassword ? 'text' : 'password'}"
                    id="auth-password"
                    class="auth-input has-toggle"
                    placeholder="••••••••"
                    autocomplete="${isSignIn ? 'current-password' : 'new-password'}"
                  />
                  <button type="button" class="auth-password-toggle" id="btn-toggle-password" title="Toggle password visibility" aria-label="Toggle password visibility">
                    ${this.showPassword ? EYE_OFF_SVG : EYE_OPEN_SVG}
                  </button>
                </div>
              </div>

              ${isSignIn ? `
                <div class="auth-options-row">
                  <label class="auth-remember-label">
                    <input type="checkbox" id="auth-remember" class="auth-checkbox" checked />
                    <span>Remember for 30 days</span>
                  </label>
                  <button type="button" class="auth-forgot-btn" id="btn-forgot-password">Forgot password</button>
                </div>
              ` : ''}

              <button type="submit" class="auth-submit-btn" id="btn-submit-auth">
                <span>${isSignIn ? 'Sign in' : 'Create account'}</span>
              </button>
            </form>

            <div class="auth-footer-prompt">
              <span>${isSignIn ? "Don't have an account?" : "Already have an account?"}</span>
              <button type="button" class="auth-link-btn" id="btn-switch-mode">
                ${isSignIn ? 'Sign up for free' : 'Log in'}
              </button>
            </div>

            <div class="auth-guest-row">
              <button type="button" class="auth-guest-link" id="btn-guest-auth">
                Continue as Guest Architect →
              </button>
            </div>
          </div>

          <!-- Right Art Panel Column -->
          <div class="auth-art-column">
            <div class="auth-art-wrapper">
              <img src="${flutedGlassUrl}" alt="AuraBIM Fluted Glass Panel" class="auth-art-image" />
            </div>
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

    this.container.querySelector('#btn-switch-mode')?.addEventListener('click', () => {
      this.activeTab = this.activeTab === 'signin' ? 'signup' : 'signin';
      this.render();
      this.bindEvents();
    });

    // Password visibility toggle
    this.container.querySelector('#btn-toggle-password')?.addEventListener('click', () => {
      this.showPassword = !this.showPassword;
      const passInput = this.container.querySelector('#auth-password') as HTMLInputElement | null;
      const toggleBtn = this.container.querySelector('#btn-toggle-password') as HTMLButtonElement | null;
      if (passInput) {
        passInput.type = this.showPassword ? 'text' : 'password';
      }
      if (toggleBtn) {
        toggleBtn.innerHTML = this.showPassword ? EYE_OFF_SVG : EYE_OPEN_SVG;
      }
    });

    // Forgot password handler
    this.container.querySelector('#btn-forgot-password')?.addEventListener('click', async () => {
      const emailInput = this.container.querySelector('#auth-email') as HTMLInputElement | null;
      const currentEmail = emailInput?.value?.trim() || '';
      const emailToReset = await customPrompt(
        'Reset Password',
        'Enter your registered email address to receive password reset instructions:',
        currentEmail,
        { placeholder: 'architect@aurabim.com', confirmText: 'Send Reset Link' }
      );
      if (emailToReset && emailToReset.trim()) {
        await customAlert(
          'Password Reset Sent',
          `If an account exists for "${emailToReset.trim()}", reset instructions have been dispatched.`
        );
      }
    });

    // Guest sign in
    this.container.querySelector('#btn-guest-auth')?.addEventListener('click', async () => {
      const user = await authService.signInAsGuest('Guest Architect');
      showToast('Entered as Guest Architect.');
      this.hide();
      this.onAuthSuccessCallback?.(user);
    });

    // Form submit
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
        const errorMsg = err?.message || 'Authentication error';
        const lower = errorMsg.toLowerCase();

        if (lower.includes('password')) {
          if (errPass) errPass.textContent = errorMsg;
          passInput?.classList.add('has-error');
          passInput?.focus();
        } else if (lower.includes('email') || lower.includes('account')) {
          if (errEmail) errEmail.textContent = errorMsg;
          emailInput?.classList.add('has-error');
          emailInput?.focus();
        }

        showToast(errorMsg, 4500);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>${this.activeTab === 'signin' ? 'Sign in' : 'Create account'}</span>`;
        }
      }
    });

    // Clear field errors as user types
    const emailEl = this.container.querySelector('#auth-email') as HTMLInputElement | null;
    const passEl = this.container.querySelector('#auth-password') as HTMLInputElement | null;
    const nameEl = this.container.querySelector('#auth-name') as HTMLInputElement | null;
    emailEl?.addEventListener('input', () => {
      emailEl.classList.remove('has-error');
      const err = this.container.querySelector('#err-auth-email');
      if (err) err.textContent = '';
    });
    passEl?.addEventListener('input', () => {
      passEl.classList.remove('has-error');
      const err = this.container.querySelector('#err-auth-password');
      if (err) err.textContent = '';
    });
    nameEl?.addEventListener('input', () => {
      nameEl.classList.remove('has-error');
      const err = this.container.querySelector('#err-auth-name');
      if (err) err.textContent = '';
    });
  }
}
