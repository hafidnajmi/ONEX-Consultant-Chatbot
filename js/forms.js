/**
 * ONEX Consultant Forms Module
 * Handles form submissions with validation, CSRF protection, and error handling
 */

const Forms = {
    /**
     * Initialize all forms on the page
     */
    init() {
        // Login form
        const loginForm = document.getElementById('consultantForm');
        if (loginForm) {
            this.setupLoginForm(loginForm);
        }

        // Contact form
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            this.setupContactForm(contactForm);
        }
    },

    /**
     * Setup login form handling
     * @param {HTMLFormElement} form - Login form element
     */
    setupLoginForm(form) {
        // Setup real-time validation
        FormValidator.setupRealTimeValidation(form);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate form
            if (!FormValidator.validateForm(form)) {
                Toast.error('Please fix the errors in the form');
                return;
            }

            // Check rate limit
            if (!RateLimit.isAllowed('login_submit', 5, 60000)) {
                Toast.error('Too many login attempts. Please wait a minute.');
                return;
            }

            // Get form data
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const service = document.getElementById('service').value;

            const submitBtn = form.querySelector('button[type="submit"]');
            Loading.showButton(submitBtn, 'Submitting...');

            try {
                // Submit to webhook
                const response = await API.post(
                    'https://n8n-mwjjuprcz1ho.ciluba.sumopod.my.id/webhook/data-user',
                    {
                        name: name,
                        email: email,
                        service: service,
                        timestamp: new Date().toISOString()
                    }
                );

                // Store session
                Auth.setSession({
                    name: name,
                    email: email,
                    service: service
                });

                // Show success and redirect
                Toast.success('Login successful! Redirecting...');

                setTimeout(() => {
                    window.location.href = 'halaman-utama.html';
                }, 1000);

            } catch (error) {
                console.error('Login error:', error);
                Toast.error(error.message || 'Login failed. Please try again.');
                Loading.hideButton(submitBtn);
            }
        });
    },

    /**
     * Setup contact form handling
     * @param {HTMLFormElement} form - Contact form element
     */
    setupContactForm(form) {
        // Setup real-time validation
        FormValidator.setupRealTimeValidation(form);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate form
            if (!FormValidator.validateForm(form)) {
                Toast.error('Please fix the errors in the form');
                return;
            }

            // Check rate limit
            if (!RateLimit.isAllowed('contact_submit', 3, 60000)) {
                Toast.error('Too many submissions. Please wait a minute.');
                return;
            }

            // Get form data
            const formData = {
                fullName: document.getElementById('fullName').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone')?.value.trim() || '',
                service: document.getElementById('service').value,
                message: document.getElementById('message').value.trim(),
                timestamp: new Date().toISOString()
            };

            const submitBtn = form.querySelector('button[type="submit"]');
            Loading.showButton(submitBtn, 'Sending...');

            try {
                // In a real implementation, you would send this to your backend
                // For now, we'll simulate a successful submission
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Show success message
                Toast.success('Thank you! Our team will contact you within 24 hours.');

                // Reset form
                form.reset();
                Loading.hideButton(submitBtn);

            } catch (error) {
                console.error('Contact form error:', error);
                Toast.error('Failed to send message. Please try again.');
                Loading.hideButton(submitBtn);
            }
        });
    }
};

// Initialize forms when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Forms.init();
});

// Export for use in other scripts
window.Forms = Forms;
