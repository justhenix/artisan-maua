/**
 * Demo-only auth helper.
 * Stores a simple flag in localStorage — no backend, no tokens.
 */

const AUTH_KEY = 'artisan-demo-auth-v1';
const DEMO_EMAIL = 'admin@artisan.hbj';
const DEMO_PASSWORD = 'pass123';

export function isLoggedIn(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(AUTH_KEY) === 'true';
}

export function login(email: string, password: string): boolean {
	if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
		localStorage.setItem(AUTH_KEY, 'true');
		return true;
	}
	return false;
}

export function logout(): void {
	localStorage.removeItem(AUTH_KEY);
}
