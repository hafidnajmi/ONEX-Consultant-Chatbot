/**
 * ONEX Consultant Utility Functions
 * Shared utilities for forms, API requests, notifications, and loading states
 */

// ===== TOAST NOTIFICATIONS =====
const Toast = {
    container: null,

    /**
     * Initialize toast container
     */
    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (info, success, warning, error)
     * @param {number} duration - Duration in milliseconds
     */
    show(message, type = 'info', duration = 3000) {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
      <div class="toast-icon">
        ${this.getIcon(type)}
      </div>
      <div class="toast-message">${Security.escapeHTML(message)}</div>
    `;

        this.container.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Get icon for toast type
     * @param {string} type - Toast type
     * @returns {string} - Icon HTML
     */
    getIcon(type) {
        const icons = {
            info: '<i class="bi bi-info-circle-fill"></i>',
            success: '<i class="bi bi-check-circle-fill"></i>',
            warning: '<i class="bi bi-exclamation-triangle-fill"></i>',
            error: '<i class="bi bi-x-circle-fill"></i>'
        };
        return icons[type] || icons.info;
    },

    success(message, duration) { this.show(message, 'success', duration); },
    error(message, duration) { this.show(message, 'error', duration); },
    warning(message, duration) { this.show(message, 'warning', duration); },
    info(message, duration) { this.show(message, 'info', duration); }
};

// ===== LOADING STATE MANAGER =====
const Loading = {
    /**
     * Show loading state on button
     * @param {HTMLElement} button - Button element
     * @param {string} text - Loading text
     */
    showButton(button, text = 'Loading...') {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = `
      <span class="spinner spinner-sm"></span>
      <span>${text}</span>
    `;
    },

    /**
     * Hide loading state on button
     * @param {HTMLElement} button - Button element
     */
    hideButton(button) {
        button.disabled = false;
        button.textContent = button.dataset.originalText || 'Submit';
        delete button.dataset.originalText;
    },

    /**
     * Show loading overlay
     * @param {string} message - Loading message
     */
    showOverlay(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'modal-backdrop';
        overlay.innerHTML = `
      <div class="card" style="padding: 2rem; text-align: center;">
        <div class="spinner" style="margin: 0 auto 1rem;"></div>
        <div>${Security.escapeHTML(message)}</div>
      </div>
    `;
        document.body.appendChild(overlay);
    },

    /**
     * Hide loading overlay
     */
    hideOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.remove();
    }
};

// ===== API REQUEST WRAPPER =====
const API = {
    /**
     * Make a POST request with error handling
     * @param {string} url - API endpoint
     * @param {Object} data - Request payload
     * @param {Object} options - Additional options
     * @returns {Promise} - Response promise
     */
    async post(url, data, options = {}) {
        try {
            // Add CSRF token
            const payload = CSRF.addToJSON(data);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: JSON.stringify(payload),
                ...options
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    /**
     * Make a GET request with error handling
     * @param {string} url - API endpoint
     * @param {Object} options - Additional options
     * @returns {Promise} - Response promise
     */
    async get(url, options = {}) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
};

// ===== FORM VALIDATION =====
const FormValidator = {
    /**
     * Validate a single form field
     * @param {HTMLElement} field - Form field element
     * @returns {Object} - Validation result
     */
    validateField(field) {
        const value = field.value.trim();
        const type = field.type;
        const required = field.hasAttribute('required');
        const minLength = field.getAttribute('minlength');
        const maxLength = field.getAttribute('maxlength');

        // Check if required
        if (required && !value) {
            return { valid: false, message: 'This field is required' };
        }

        // Skip validation if empty and not required
        if (!value && !required) {
            return { valid: true, message: '' };
        }

        // Type-specific validation
        switch (type) {
            case 'email':
                if (!Validator.isEmail(value)) {
                    return { valid: false, message: 'Please enter a valid email address' };
                }
                break;

            case 'tel':
                if (!Validator.isPhone(value)) {
                    return { valid: false, message: 'Please enter a valid phone number' };
                }
                break;

            case 'url':
                if (!Validator.isURL(value)) {
                    return { valid: false, message: 'Please enter a valid URL' };
                }
                break;
        }

        // Length validation
        if (minLength && value.length < parseInt(minLength)) {
            return { valid: false, message: `Minimum ${minLength} characters required` };
        }

        if (maxLength && value.length > parseInt(maxLength)) {
            return { valid: false, message: `Maximum ${maxLength} characters allowed` };
        }

        // XSS check
        if (!Security.isInputSafe(value)) {
            return { valid: false, message: 'Invalid characters detected' };
        }

        return { valid: true, message: '' };
    },

    /**
     * Show field error
     * @param {HTMLElement} field - Form field element
     * @param {string} message - Error message
     */
    showError(field, message) {
        field.classList.add('error');

        // Remove existing error
        const existingError = field.parentElement.querySelector('.form-error');
        if (existingError) existingError.remove();

        // Add new error
        if (message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'form-error';
            errorDiv.textContent = message;
            field.parentElement.appendChild(errorDiv);
        }
    },

    /**
     * Clear field error
     * @param {HTMLElement} field - Form field element
     */
    clearError(field) {
        field.classList.remove('error');
        const errorDiv = field.parentElement.querySelector('.form-error');
        if (errorDiv) errorDiv.remove();
    },

    /**
     * Validate entire form
     * @param {HTMLFormElement} form - Form element
     * @returns {boolean} - True if valid
     */
    validateForm(form) {
        const fields = form.querySelectorAll('input, select, textarea');
        let isValid = true;

        fields.forEach(field => {
            const result = this.validateField(field);

            if (!result.valid) {
                this.showError(field, result.message);
                isValid = false;
            } else {
                this.clearError(field);
            }
        });

        return isValid;
    },

    /**
     * Setup real-time validation for a form
     * @param {HTMLFormElement} form - Form element
     */
    setupRealTimeValidation(form) {
        const fields = form.querySelectorAll('input, select, textarea');

        fields.forEach(field => {
            field.addEventListener('blur', () => {
                const result = this.validateField(field);
                if (!result.valid) {
                    this.showError(field, result.message);
                } else {
                    this.clearError(field);
                }
            });

            field.addEventListener('input', () => {
                if (field.classList.contains('error')) {
                    const result = this.validateField(field);
                    if (result.valid) {
                        this.clearError(field);
                    }
                }
            });
        });
    }
};

// ===== UTILITY FUNCTIONS =====
const Utils = {
    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} - Debounced function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} - Throttled function
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Format date to readable string
     * @param {Date|string} date - Date object or string
     * @returns {string} - Formatted date
     */
    formatDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    /**
     * Generate unique ID
     * @returns {string} - Unique ID
     */
    generateId() {
        return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};

// Export for use in other scripts
window.Toast = Toast;
window.Loading = Loading;
window.API = API;
window.FormValidator = FormValidator;
window.Utils = Utils;
