/**
 * AuraBIM Studio — Auth Page Controller
 * Aligned with Dashboard Design Language (DESIGN_SYSTEM.md)
 */

import { authService, AuthUserProfile } from '../../services/auth-service';
import { showToast } from '../toast-notifier';
import { customPrompt, customAlert } from '../custom-dialog';
import { renderAuthMarkup, EYE_OPEN_SVG, EYE_OFF_SVG } from './auth-template';

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
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    this.container.innerHTML = renderAuthMarkup({
      activeTab: this.activeTab,
      showPassword: this.showPassword,
      currentTheme
    });
  }

  private bindEvents() {
    // 1. Pointer Event Isolation: Never leak clicks or drags to CAD canvas underneath
    ['pointerdown', 'mousedown', 'touchstart', 'click', 'dblclick'].forEach(evt => {
      this.container.addEventListener(evt, e => e.stopPropagation());
    });

    // 2. Dismiss / Close button
    this.container.querySelector('#btn-close-auth')?.addEventListener('click', () => {
      const user = authService.getCurrentUser();
      if (!user) {
        // If not logged in, enter as guest instead of showing a blank canvas
        authService.signInAsGuest('Guest Architect').then(guest => {
          showToast('Entered workspace as Guest Architect');
          this.hide();
          this.onAuthSuccessCallback?.(guest);
        });
      } else {
        this.hide();
      }
    });

    // 3. Theme Toggle Button
    this.container.querySelector('#btn-auth-theme')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      try {
        localStorage.setItem('aurabim_theme', nextTheme);
      } catch {}
      this.render();
      this.bindEvents();
    });

    // 4. Segmented Control Switcher
    this.container.querySelector('#tab-auth-signin')?.addEventListener('click', () => {
      if (this.activeTab !== 'signin') {
        this.activeTab = 'signin';
        this.render();
        this.bindEvents();
      }
    });

    this.container.querySelector('#tab-auth-signup')?.addEventListener('click', () => {
      if (this.activeTab !== 'signup') {
        this.activeTab = 'signup';
        this.render();
        this.bindEvents();
      }
    });

    this.container.querySelector('#btn-switch-mode')?.addEventListener('click', () => {
      this.activeTab = this.activeTab === 'signin' ? 'signup' : 'signin';
      this.render();
      this.bindEvents();
    });

    // 5. Auto-Fill Demo Credentials
    this.container.querySelector('#btn-auto-fill-demo')?.addEventListener('click', () => {
      const emailInput = this.container.querySelector('#auth-email') as HTMLInputElement | null;
      const passInput = this.container.querySelector('#auth-password') as HTMLInputElement | null;
      if (emailInput) {
        emailInput.value = 'architect@aurabim.com';
        emailInput.classList.remove('has-error');
      }
      if (passInput) {
        passInput.value = 'architect123';
        passInput.classList.remove('has-error');
      }
      showToast('Demo credentials filled: architect@aurabim.com');
    });

    // 6. Password Visibility Toggle
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

    // 7. Forgot Password Dialog
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

    // 8. Guest Sign-In
    this.container.querySelector('#btn-guest-auth')?.addEventListener('click', async () => {
      const user = await authService.signInAsGuest('Guest Architect');
      showToast('Entered as Guest Architect.');
      this.hide();
      this.onAuthSuccessCallback?.(user);
    });

    // 9. Form Submission
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
          submitBtn.innerHTML = `<span>${this.activeTab === 'signin' ? 'Sign In to Studio' : 'Create Free Account'}</span>`;
        }
      }
    });

    // 10. Clear field error states on user typing
    ['auth-email', 'auth-password', 'auth-name'].forEach(id => {
      const el = this.container.querySelector(`#${id}`) as HTMLInputElement | null;
      el?.addEventListener('input', () => {
        el.classList.remove('has-error');
        const err = this.container.querySelector(`#err-${id}`);
        if (err) err.textContent = '';
      });
    });
  }
}
