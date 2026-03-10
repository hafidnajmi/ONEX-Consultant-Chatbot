/**
 * ONEX Consultant Authentication Module
 * Secure session management with encrypted storage
 */

const Auth = {
    SESSION_KEY: 'onex_session',
    ACCESS_KEY: 'onex_access_granted',

    /**
     * Check if user is authenticated
     * @returns {boolean} - True if authenticated
     */
    isAuthenticated() {
        return SecureStorage.getItem(this.ACCESS_KEY) === true;
    },

    /**
     * Get current session data
     * @returns {Object|null} - Session data
     */
    getSession() {
        return SecureStorage.getItem(this.SESSION_KEY);
    },

    /**
     * Set user session
     * @param {Object} userData - User data to store
     */
    setSession(userData) {
        SecureStorage.setItem(this.ACCESS_KEY, true);
        SecureStorage.setItem(this.SESSION_KEY, userData);
        SecureStorage.setItem('user_name', userData.name); // Store name separately for easy access
        this.updateActivity();
    },

    /**
     * Clear session (logout)
     */
    clearSession() {
        SecureStorage.removeItem(this.SESSION_KEY);
        SecureStorage.removeItem(this.ACCESS_KEY);
        SecureStorage.removeItem('user_name');
    },

    /**
     * Update last activity timestamp
     */
    updateActivity() {
        const session = this.getSession();
        if (session) {
            session.lastActivity = Date.now();
            SecureStorage.setItem(this.SESSION_KEY, session);
        }
    },

    /**
     * Check if session has expired
     * @param {number} timeout - Timeout in milliseconds (default: 30 minutes)
     * @returns {boolean} - True if expired
     */
    isSessionExpired(timeout = 30 * 60 * 1000) {
        const session = this.getSession();
        if (!session || !session.lastActivity) return true;

        return Date.now() - session.lastActivity > timeout;
    },

    /**
     * Initialize auth system with activity tracking
     * @param {number} timeout - Session timeout in milliseconds
     */
    init(timeout = 30 * 60 * 1000) {
        // Check session expiration on load
        if (this.isAuthenticated() && this.isSessionExpired(timeout)) {
            this.clearSession();
            // Don't redirect - just clear session
            return;
        }

        // Update activity on user interactions
        const updateActivity = () => this.updateActivity();
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, Utils.throttle(updateActivity, 60000));
        });

        // Check expiration periodically
        setInterval(() => {
            if (this.isAuthenticated() && this.isSessionExpired(timeout)) {
                this.clearSession();
                Toast.warning('Your session has expired. Please log in again via the chatbot.');
            }
        }, 60000); // Check every minute
    },

    /**
     * Protect page (redirect if not authenticated)
     * @param {string} loginPage - Login page URL
     */
    protect(loginPage = 'halaman-utama.html') {
        if (!this.isAuthenticated()) {
            window.location.href = loginPage;
        }
    }
};

// Export for use in other scripts
window.Auth = Auth;
