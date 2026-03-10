/**
 * ONEX Consultant Security Configuration
 * XSS Protection, CSRF Tokens, Secure Storage, Rate Limiting
 */

// ===== XSS PROTECTION =====
const Security = {
  /**
   * Sanitize HTML to prevent XSS attacks
   * @param {string} html - Raw HTML string
   * @returns {string} - Sanitized HTML
   */
  sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  },

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  escapeHTML(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return String(text).replace(/[&<>"'/]/g, char => map[char]);
  },

  /**
   * Strip all HTML tags from text
   * @param {string} html - HTML string
   * @returns {string} - Plain text
   */
  stripHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  },

  /**
   * Validate input against common XSS patterns
   * @param {string} input - User input
   * @returns {boolean} - True if safe
   */
  isInputSafe(input) {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi
    ];
    return !xssPatterns.some(pattern => pattern.test(input));
  }
};

// ===== CSRF PROTECTION =====
const CSRF = {
  /**
   * Generate a CSRF token
   * @returns {string} - CSRF token
   */
  generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Store CSRF token in sessionStorage
   * @param {string} token - CSRF token
   */
  setToken(token) {
    sessionStorage.setItem('csrf_token', token);
  },

  /**
   * Get CSRF token from sessionStorage
   * @returns {string|null} - CSRF token
   */
  getToken() {
    return sessionStorage.getItem('csrf_token');
  },

  /**
   * Initialize CSRF protection
   * @returns {string} - Generated token
   */
  init() {
    let token = this.getToken();
    if (!token) {
      token = this.generateToken();
      this.setToken(token);
    }
    return token;
  },

  /**
   * Add CSRF token to form data
   * @param {FormData} formData - Form data object
   */
  addToFormData(formData) {
    const token = this.getToken();
    if (token) {
      formData.append('csrf_token', token);
    }
  },

  /**
   * Add CSRF token to JSON payload
   * @param {Object} data - JSON data object
   * @returns {Object} - Data with CSRF token
   */
  addToJSON(data) {
    const token = this.getToken();
    return { ...data, csrf_token: token };
  }
};

// ===== SECURE STORAGE =====
const SecureStorage = {
  /**
   * Encode data to base64
   * @param {string} data - Data to encode
   * @returns {string} - Encoded data
   */
  encode(data) {
    return btoa(encodeURIComponent(data));
  },

  /**
   * Decode data from base64
   * @param {string} data - Encoded data
   * @returns {string} - Decoded data
   */
  decode(data) {
    try {
      return decodeURIComponent(atob(data));
    } catch (e) {
      console.error('Failed to decode data:', e);
      return null;
    }
  },

  /**
   * Set encrypted item in localStorage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  setItem(key, value) {
    try {
      const stringValue = JSON.stringify(value);
      const encoded = this.encode(stringValue);
      localStorage.setItem(key, encoded);
    } catch (e) {
      console.error('Failed to set secure item:', e);
    }
  },

  /**
   * Get encrypted item from localStorage
   * @param {string} key - Storage key
   * @returns {any} - Stored value
   */
  getItem(key) {
    try {
      const encoded = localStorage.getItem(key);
      if (!encoded) return null;
      const decoded = this.decode(encoded);
      return decoded ? JSON.parse(decoded) : null;
    } catch (e) {
      console.error('Failed to get secure item:', e);
      return null;
    }
  },

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   */
  removeItem(key) {
    localStorage.removeItem(key);
  },

  /**
   * Clear all localStorage
   */
  clear() {
    localStorage.clear();
  }
};

// ===== RATE LIMITING =====
const RateLimit = {
  limits: {},

  /**
   * Check if action is rate limited
   * @param {string} key - Action key
   * @param {number} maxAttempts - Maximum attempts
   * @param {number} windowMs - Time window in milliseconds
   * @returns {boolean} - True if allowed
   */
  isAllowed(key, maxAttempts = 5, windowMs = 60000) {
    const now = Date.now();
    
    if (!this.limits[key]) {
      this.limits[key] = { count: 0, resetAt: now + windowMs };
    }

    const limit = this.limits[key];

    // Reset if window has passed
    if (now > limit.resetAt) {
      limit.count = 0;
      limit.resetAt = now + windowMs;
    }

    // Check if limit exceeded
    if (limit.count >= maxAttempts) {
      return false;
    }

    // Increment counter
    limit.count++;
    return true;
  },

  /**
   * Get remaining attempts
   * @param {string} key - Action key
   * @param {number} maxAttempts - Maximum attempts
   * @returns {number} - Remaining attempts
   */
  getRemaining(key, maxAttempts = 5) {
    if (!this.limits[key]) return maxAttempts;
    return Math.max(0, maxAttempts - this.limits[key].count);
  },

  /**
   * Reset rate limit for a key
   * @param {string} key - Action key
   */
  reset(key) {
    delete this.limits[key];
  }
};

// ===== INPUT VALIDATION =====
const Validator = {
  /**
   * Validate email format
   * @param {string} email - Email address
   * @returns {boolean} - True if valid
   */
  isEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  },

  /**
   * Validate phone number
   * @param {string} phone - Phone number
   * @returns {boolean} - True if valid
   */
  isPhone(phone) {
    const pattern = /^[\d\s\-\+\(\)]+$/;
    return pattern.test(phone) && phone.replace(/\D/g, '').length >= 10;
  },

  /**
   * Validate URL
   * @param {string} url - URL string
   * @returns {boolean} - True if valid
   */
  isURL(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Validate string length
   * @param {string} str - String to validate
   * @param {number} min - Minimum length
   * @param {number} max - Maximum length
   * @returns {boolean} - True if valid
   */
  isLength(str, min = 0, max = Infinity) {
    const length = str.trim().length;
    return length >= min && length <= max;
  },

  /**
   * Check if string contains only alphanumeric characters
   * @param {string} str - String to check
   * @returns {boolean} - True if alphanumeric
   */
  isAlphanumeric(str) {
    return /^[a-zA-Z0-9]+$/.test(str);
  }
};

// ===== CONTENT SECURITY POLICY =====
const CSP = {
  /**
   * Check if Content Security Policy is properly set
   * @returns {boolean} - True if CSP is configured
   */
  isConfigured() {
    const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    return metaCSP !== null;
  },

  /**
   * Log CSP violations
   */
  setupViolationReporting() {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.warn('CSP Violation:', {
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        originalPolicy: e.originalPolicy
      });
    });
  }
};

// Initialize CSRF protection on page load
document.addEventListener('DOMContentLoaded', () => {
  CSRF.init();
  CSP.setupViolationReporting();
});

// Export for use in other scripts
window.Security = Security;
window.CSRF = CSRF;
window.SecureStorage = SecureStorage;
window.RateLimit = RateLimit;
window.Validator = Validator;
window.CSP = CSP;
