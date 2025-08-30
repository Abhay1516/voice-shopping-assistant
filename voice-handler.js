// Voice Recognition and Processing Module
class VoiceHandler {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isSupported = false;
        this.currentLanguage = 'en-US';
        this.commandHistory = [];
        
        this.initializeVoiceRecognition();
        this.setupEventListeners();
    }

    // Initialize Speech Recognition API
    initializeVoiceRecognition() {
        // Check for browser support
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
            
            console.log('🗣️ Voice command:', transcript, '(confidence:', confidence + ')');
            this.processVoiceCommand(transcript, confidence);
        };

        this.recognition.onerror = (event) => {
            console.error('❌ Speech recognition error:', event.error);
            this.handleRecognitionError(event.error);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateUI('idle');
            console.log('🔇 Voice recognition ended');
        };
    }

    // Setup UI event listeners
    setupEventListeners() {
        const voiceBtn = document.getElementById('voiceBtn');
        const manualInput = document.getElementById('manualInput');
        const addManualBtn = document.getElementById('addManualBtn');

        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => this.toggleVoiceRecognition());
        }

        if (manualInput) {
            manualInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addManualItem();
                }
            });
        }

        if (addManualBtn) {
            addManualBtn.addEventListener('click', () => this.addManualItem());
        }
    }

    // Toggle voice recognition on/off
    toggleVoiceRecognition() {
        if (!this.isSupported) {
            this.showError('Voice recognition is not supported in your browser');
            return;
        }

        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    // Start voice recognition
    startListening() {
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            this.showError('Could not start voice recognition. Please try again.');
        }
    }

    // Stop voice recognition
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    // Process voice commands using NLP
    processVoiceCommand(transcript, confidence) {
        const command = transcript.toLowerCase().trim();
        this.commandHistory.push({ command, confidence, timestamp: new Date() });
        
        // Show what was heard
        this.showLastCommand(transcript);
        
        // Parse the command
        const parsedCommand = this.parseCommand(command);
        
        if (parsedCommand) {
            this.executeCommand(parsedCommand);
        } else {
            this.showError(`Sorry, I didn't understand: "${transcript}". Try saying "Add [item]" or "Remove [item]".`);
        }
    }

    // Parse voice commands into structured data
    parseCommand(command) {
        const patterns = {
            // Add commands
            add: [
                /^(add|i need|i want|put|get me|buy|purchase)\s+(.+?)(\s+to\s+(my\s+)?(list|cart))?$/i,
                /^(.+?)\s+(to\s+(my\s+)?(list|cart|shopping))$/i
            ],
            
            // Remove commands
            remove: [
                /^(remove|delete|take\s+off|cross\s+off)\s+(.+?)(\s+from\s+(my\s+)?(list|cart))?$/i,
                /^(.+?)\s+off\s+(my\s+)?(list|cart)$/i
            ],
            
            // Search commands
            search: [
                /^(find|search\s+for|look\s+for|show\s+me)\s+(.+)$/i
            ],
            
            // Quantity patterns
            quantity: /^(\d+|\w+)\s+(bottles?|cans?|boxes?|bags?|pounds?|kilos?|pieces?|items?)\s+of\s+(.+)$/i,
            numbers: /^(\d+)\s+(.+)$/i
        };

        // Check for add commands
        for (const pattern of patterns.add) {
            const match = command.match(pattern);
            if (match) {
                const item = this.extractItemDetails(match[2] || match[1]);
                return {
                    action: 'add',
                    item: item.name,
                    quantity: item.quantity,
                    category: this.categorizeItem(item.name)
                };
            }
        }

        // Check for remove commands
        for (const pattern of patterns.remove) {
            const match = command.match(pattern);
            if (match) {
                return {
                    action: 'remove',
                    item: match[2] || match[1]
                };
            }
        }

        // Check for search commands
        for (const pattern of patterns.search) {
            const match = command.match(pattern);
            if (match) {
                return {
                    action: 'search',
                    query: match[2]
                };
            }
        }

        return null;
    }

    // Extract item details including quantity
    extractItemDetails(itemText) {
        const quantityPatterns = [
            /^(\d+|\w+)\s+(bottles?|cans?|boxes?|bags?|pounds?|kilos?|pieces?|items?)\s+of\s+(.+)$/i,
            /^(\d+)\s+(.+)$/i
        ];

        for (const pattern of quantityPatterns) {
            const match = itemText.match(pattern);
            if (match) {
                return {
                    name: match[3] || match[2],
                    quantity: this.parseQuantity(match[1])
                };
            }
        }

        return {
            name: itemText,
            quantity: 1
        };
    }

    // Parse quantity from text
    parseQuantity(quantityText) {
        const numberWords = {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'a': 1, 'an': 1
        };

        const lowerText = quantityText.toLowerCase();
        if (numberWords[lowerText]) {
            return numberWords[lowerText];
        }

        const num = parseInt(quantityText);
        return isNaN(num) ? 1 : num;
    }

    // Categorize items automatically
    categorizeItem(itemName) {
        const categories = {
            'Dairy': ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'eggs'],
            'Produce': ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'onion', 'carrot', 'potato'],
            'Meat': ['chicken', 'beef', 'pork', 'fish', 'turkey', 'salmon'],
            'Bakery': ['bread', 'bagel', 'croissant', 'muffin', 'cake'],
            'Pantry': ['rice', 'pasta', 'flour', 'sugar', 'oil', 'vinegar'],
            'Beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'beer', 'wine'],
            'Snacks': ['chips', 'cookies', 'crackers', 'nuts', 'candy'],
            'Household': ['detergent', 'soap', 'shampoo', 'toilet paper', 'paper towels'],
            'Frozen': ['ice cream', 'frozen pizza', 'frozen vegetables']
        };

        const lowerItem = itemName.toLowerCase();
        for (const [category, items] of Object.entries(categories)) {
            if (items.some(item => lowerItem.includes(item) || item.includes(lowerItem))) {
                return category;
            }
        }

        return 'Other';
    }

    // Execute parsed commands
    async executeCommand(parsedCommand) {
        try {
            switch (parsedCommand.action) {
                case 'add':
                    await window.shoppingApp.addItem(parsedCommand);
                    this.showSuccess(`Added ${parsedCommand.quantity} ${parsedCommand.item} to your list`);
                    break;

                case 'remove':
                    const removed = await window.shoppingApp.removeItem(parsedCommand.item);
                    if (removed) {
                        this.showSuccess(`Removed ${parsedCommand.item} from your list`);
                    } else {
                        this.showError(`Could not find ${parsedCommand.item} in your list`);
                    }
                    break;

                case 'search':
                    await window.shoppingApp.searchItems(parsedCommand.query);
                    this.showSuccess(`Searching for ${parsedCommand.query}`);
                    break;

                default:
                    this.showError('Unknown command');
            }
        } catch (error) {
            console.error('Error executing command:', error);
            this.showError('Sorry, there was an error processing your command');
        }
    }

    // Add manual item
    addManualItem() {
        const input = document.getElementById('manualInput');
        const itemName = input.value.trim();
        
        if (itemName) {
            const itemDetails = this.extractItemDetails(itemName);
            const parsedCommand = {
                action: 'add',
                item: itemDetails.name,
                quantity: itemDetails.quantity,
                category: this.categorizeItem(itemDetails.name)
            };
            
            this.executeCommand(parsedCommand);
            input.value = '';
        }
    }

    // Handle recognition errors
    handleRecognitionError(error) {
        let errorMessage = 'Voice recognition error: ';
        
        switch (error) {
            case 'no-speech':
                errorMessage += 'No speech detected. Please try again.';
                break;
            case 'audio-capture':
                errorMessage += 'Microphone not accessible. Please check permissions.';
                break;
            case 'not-allowed':
                errorMessage += 'Microphone access denied. Please allow microphone access.';
                break;
            case 'network':
                errorMessage += 'Network error. Please check your connection.';
                break;
            default:
                errorMessage += error;
        }
        
        this.showError(errorMessage);
        this.updateUI('error');
    }

    // Update UI based on voice recognition state
    updateUI(state) {
        const voiceBtn = document.getElementById('voiceBtn');
        const voiceBtnText = document.getElementById('voiceBtnText');
        const voiceStatus = document.getElementById('voiceStatus');

        if (!voiceBtn || !voiceBtnText || !voiceStatus) return;

        switch (state) {
            case 'listening':
                voiceBtn.className = 'btn btn-danger btn-lg mb-3 listening voice-wave';
                voiceBtnText.textContent = 'Listening...';
                voiceStatus.classList.remove('d-none');
                break;
            
            case 'idle':
                voiceBtn.className = 'btn btn-success btn-lg mb-3';
                voiceBtnText.textContent = 'Start Listening';
                voiceStatus.classList.add('d-none');
                break;
            
            case 'error':
                voiceBtn.className = 'btn btn-warning btn-lg mb-3';
                voiceBtnText.textContent = 'Try Again';
                voiceStatus.classList.add('d-none');
                break;
        }
    }

    // Show last command heard
    showLastCommand(command) {
        const lastCommandDiv = document.getElementById('lastCommand');
        const commandText = document.getElementById('commandText');
        
        if (lastCommandDiv && commandText) {
            commandText.textContent = command;
            lastCommandDiv.classList.remove('d-none');
            
            // Hide after 5 seconds
            setTimeout(() => {
                lastCommandDiv.classList.add('d-none');
            }, 5000);
        }
    }

    // Show success message
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    // Show error message
    showError(message) {
        this.showNotification(message, 'error');
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 1000;
            min-width: 300px;
            animation: fadeInUp 0.5s ease;
        `;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
            <button type="button" class="btn-close float-end" onclick="this.parentElement.remove()"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Change language
    changeLanguage(langCode) {
        this.currentLanguage = langCode;
        if (this.recognition) {
            this.recognition.lang = langCode;
        }
    }

    // Get supported languages
    getSupportedLanguages() {
        return [
            { code: 'en-US', name: 'English (US)' },
            { code: 'en-GB', name: 'English (UK)' },
            { code: 'es-ES', name: 'Spanish' },
            { code: 'fr-FR', name: 'French' },
            { code: 'de-DE', name: 'German' },
            { code: 'it-IT', name: 'Italian' },
            { code: 'pt-BR', name: 'Portuguese' },
            { code: 'ru-RU', name: 'Russian' },
            { code: 'ja-JP', name: 'Japanese' },
            { code: 'ko-KR', name: 'Korean' },
            { code: 'zh-CN', name: 'Chinese (Simplified)' }
        ];
    }

    // Get command history
    getCommandHistory() {
        return this.commandHistory;
    }

    // Clear command history
    clearCommandHistory() {
        this.commandHistory = [];
    }
}

// Create and export voice handler instance
const voiceHandler = new VoiceHandler();

// Make it globally accessible
window.voiceHandler = voiceHandler;

export default voiceHandler;