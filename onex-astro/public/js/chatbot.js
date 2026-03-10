/**
 * ONEX Consultant AI Chatbot Module
 * Secure chatbot functionality with XSS protection and rate limiting
 */

const Chatbot = {
    // Configuration
    config: {
        webhookURL: 'https://n8n-mwjjuprcz1ho.ciluba.sumopod.my.id/webhook/chat-input',
        sessionKey: 'onex_chat_session_id',
        maxMessagesPerMinute: 10,
        rateLimitKey: 'chatbot_send'
    },

    // DOM Elements (will be set on init)
    elements: {},

    /**
   * Initialize chatbot
   */
    init() {
        this.elements = {
            badge: document.getElementById('chatbotBadge'),
            window: document.getElementById('chatWindow'),
            minimizeBtn: document.getElementById('minimizeBtn'),
            messages: document.getElementById('chatMessages'),
            input: document.getElementById('userInput'),
            sendBtn: document.getElementById('sendButton'),
            loginForm: document.getElementById('chatLoginForm'),
            loginSubmit: document.getElementById('chatLoginSubmit')
        };

        this.setupEventListeners();
        this.ensureSessionId();
        this.checkAuthStatus();
    },

    /**
     * Check if user is authenticated and show/hide login form
     */
    checkAuthStatus() {
        const isAuthenticated = Auth.isAuthenticated();
        if (isAuthenticated) {
            // Hide login form, show chat input
            if (this.elements.loginForm) {
                this.elements.loginForm.classList.add('hidden');
            }
            // Update welcome message
            const userName = SecureStorage.getItem('user_name') || 'there';
            this.clearChat();
            this.addMessage(`Welcome back, ${userName}! How can I assist you today?`, 'bot');
        } else {
            // Show login form, hide chat input
            if (this.elements.loginForm) {
                this.elements.loginForm.classList.remove('hidden');
            }
            const chatInput = document.querySelector('.chat-input');
            if (chatInput) {
                chatInput.style.display = 'none';
            }
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle chat window
        this.elements.badge?.addEventListener('click', () => this.openChat());
        this.elements.minimizeBtn?.addEventListener('click', () => this.closeChat());

        // Login form submission
        this.elements.loginSubmit?.addEventListener('click', () => this.handleLogin());

        // Send message
        this.elements.sendBtn?.addEventListener('click', () => this.sendMessage());
        this.elements.input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    },

    /**
     * Handle login form submission
     */
    async handleLogin() {
        const name = document.getElementById('chatName')?.value.trim();
        const email = document.getElementById('chatEmail')?.value.trim();
        const service = document.getElementById('chatService')?.value;

        // Validate
        if (!name || !email || !service) {
            Toast.warning('Please fill out all fields');
            return;
        }

        if (!Validator.isEmail(email)) {
            Toast.error('Please enter a valid email address');
            return;
        }

        // Check rate limit
        if (!RateLimit.isAllowed('chat_login', 5, 60000)) {
            Toast.error('Too many login attempts. Please wait a minute.');
            return;
        }

        Loading.showButton(this.elements.loginSubmit, 'Submitting...');

        try {
            // Submit to webhook
            await API.post(
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

            // Hide form, show chat input
            if (this.elements.loginForm) {
                this.elements.loginForm.classList.add('hidden');
            }
            const chatInput = document.querySelector('.chat-input');
            if (chatInput) {
                chatInput.style.display = 'flex';
            }

            // Show welcome message
            this.addMessage(`Welcome, ${name}! I'm ONEX AI Agent. How can I help you today?`, 'bot');

            Toast.success('Login successful!');
            Loading.hideButton(this.elements.loginSubmit);

        } catch (error) {
            console.error('Login error:', error);
            Toast.error('Login failed. Please try again.');
            Loading.hideButton(this.elements.loginSubmit);
        }
    },

    /**
     * Get or create session ID
     * @returns {string} - Session ID
     */
    ensureSessionId() {
        let sessionId = SecureStorage.getItem(this.config.sessionKey);
        if (!sessionId) {
            sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            SecureStorage.setItem(this.config.sessionKey, sessionId);
        }
        return sessionId;
    },

    /**
     * Open chat window
     */
    openChat() {
        this.elements.window?.classList.add('active');
        if (this.elements.badge) {
            this.elements.badge.style.display = 'none';
        }
        this.elements.input?.focus();
    },

    /**
     * Close chat window
     */
    closeChat() {
        this.elements.window?.classList.remove('active');
        if (this.elements.badge) {
            this.elements.badge.style.display = 'flex';
        }
    },

    /**
     * Add message to chat
     * @param {string} content - Message content
     * @param {string} type - Message type ('user' or 'bot')
     */
    addMessage(content, type = 'bot') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;

        // Bot messages from n8n webhook are trusted, allow HTML formatting
        // User messages must be escaped for security (prevent XSS)
        const safeContent = type === 'bot' ? content : Security.escapeHTML(content);

        messageDiv.innerHTML = `<div class="text">${safeContent}</div>`;

        this.elements.messages?.appendChild(messageDiv);
        this.scrollToBottom();
    },

    /**
     * Add loading indicator
     * @returns {HTMLElement} - Loading element
     */
    addLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot-message';
        loadingDiv.id = 'chatbot-loading';
        loadingDiv.innerHTML = `
      <div class="text" style="color: var(--gray-600); font-style: italic;">
        <span class="spinner spinner-sm" style="display: inline-block; vertical-align: middle; margin-right: 8px;"></span>
        Typing...
      </div>
    `;

        this.elements.messages?.appendChild(loadingDiv);
        this.scrollToBottom();
        return loadingDiv;
    },

    /**
     * Remove loading indicator
     */
    removeLoading() {
        const loading = document.getElementById('chatbot-loading');
        if (loading) loading.remove();
    },

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        if (this.elements.messages) {
            this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        }
    },

    /**
     * Send message to chatbot
     */
    async sendMessage() {
        const message = this.elements.input?.value.trim();

        // Validate message
        if (!message) {
            Toast.warning('Please enter a message');
            return;
        }

        // Check rate limit
        if (!RateLimit.isAllowed(this.config.rateLimitKey, this.config.maxMessagesPerMinute, 60000)) {
            Toast.error('Too many messages. Please wait a minute.');
            return;
        }

        // Validate input safety
        if (!Security.isInputSafe(message)) {
            Toast.error('Invalid characters detected in message');
            return;
        }

        // Add user message
        this.addMessage(message, 'user');
        this.elements.input.value = '';

        // Show loading
        const loading = this.addLoading();

        try {
            // Send to webhook
            const response = await API.post(this.config.webhookURL, {
                message: message,
                user_id: this.ensureSessionId(),
                timestamp: new Date().toISOString()
            });

            // Remove loading
            this.removeLoading();

            // Add bot response
            const botMessage = response.response || "Sorry, I couldn't process that. Please try again.";
            this.addMessage(botMessage, 'bot');

        } catch (error) {
            console.error('Chatbot error:', error);
            this.removeLoading();

            // Show error message
            this.addMessage(
                '⚠️ Unable to connect. Please check your internet connection and try again.',
                'bot'
            );

            Toast.error('Failed to send message');
        }
    },

    /**
     * Clear chat history
     */
    clearChat() {
        if (this.elements.messages) {
            this.elements.messages.innerHTML = `
        <div class="message bot-message">
          <div class="text">
            Hello! I'm your ONEX AI Consultant. How can I assist you today?
          </div>
        </div>
      `;
        }
    }
};

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all dependencies are loaded
    setTimeout(() => {
        Chatbot.init();
    }, 100);
});

// Export for use in other scripts
window.Chatbot = Chatbot;
