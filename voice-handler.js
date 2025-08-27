// Voice Recognition and Processing Module
class VoiceHandler {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isSupported = false;
        this.currentLanguage = 'en-US';
        this.commandHistory = [];

        this.initializeVoiceRecognition();
    }

    // Initialize Speech Recognition API
    initializeVoiceRecognition() {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.isSupported = true;

            // Configure recognition settings
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;
            this.recognition.lang = this.currentLanguage;

            this.setupRecognitionEvents();
            console.log('✅ Voice recognition initialized');
        } else {
            console.warn('⚠️ Speech Recognition not supported in this browser');
            this.showError('Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
        }
    }

    // Setup recognition event listeners
    setupRecognitionEvents() {
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUI('listening');
            console.log('🎤 Voice recognition started');
        };

        this.recognition.onresult = (event) => {
            const result = event.results[0];
            const transcript = result[0].transcript;
            const confidence = result[0].confidence;

            console.log(`📝 Transcript: ${transcript} (Confidence: ${confidence})`);

            // Save command in history
            this.commandHistory.push({ transcript, confidence, time: new Date() });

            // Process the command (custom logic)
            this.processCommand(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error('❌ Recognition error:', event.error);
            this.showError(`Error: ${event.error}`);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateUI('idle');
            console.log('🛑 Voice recognition stopped');
        };
    }

    // Start listening
    startListening() {
        if (this.isSupported && !this.isListening) {
            this.recognition.start();
        }
    }

    // Stop listening
    stopListening() {
        if (this.isSupported && this.isListening) {
            this.recognition.stop();
        }
    }

    // Process recognized command (custom logic)
    processCommand(transcript) {
        transcript = transcript.toLowerCase();

        if (transcript.includes('add to cart')) {
            console.log('🛒 Command: Add to cart');
            this.updateUI('command', 'Added item to cart');
        } else if (transcript.includes('checkout')) {
            console.log('💳 Command: Checkout');
            this.updateUI('command', 'Proceeding to checkout');
        } else {
            console.log('🤔 Unrecognized command');
            this.updateUI('command', `Unrecognized command: "${transcript}"`);
        }
    }

    // Update UI based on state
    updateUI(state, message = '') {
        const statusElement = document.getElementById('voice-status');
        if (!statusElement) return;

        switch (state) {
            case 'listening':
                statusElement.textContent = '🎤 Listening...';
                statusElement.style.color = 'green';
                break;
            case 'idle':
                statusElement.textContent = '🛑 Not listening';
                statusElement.style.color = 'red';
                break;
            case 'command':
                statusElement.textContent = `✅ ${message}`;
                statusElement.style.color = 'blue';
                break;
            default:
                statusElement.textContent = '';
        }
    }

    // Show errors
    showError(message) {
        const errorElement = document.getElementById('voice-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.color = 'red';
        }
    }
}

// Example usage
const voiceHandler = new VoiceHandler();
document.getElementById('start-btn').addEventListener('click', () => voiceHandler.startListening());
document.getElementById('stop-btn').addEventListener('click', () => voiceHandler.stopListening());
