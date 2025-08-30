// AI-Powered Smart Suggestions Module
class AISuggestions {
    constructor() {
        this.apiKey = null; // Will be set from environment or user input
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
        this.fallbackSuggestions = this.loadFallbackSuggestions();
        this.userPreferences = this.loadUserPreferences();
        this.seasonalItems = this.getSeasonalItems();
        this.commonSubstitutes = this.loadCommonSubstitutes();
    }

    // Generate suggestions for specific occasions
    getOccasionSuggestions(occasion) {
        const occasionMap = {
            'breakfast': ['eggs', 'bacon', 'toast', 'orange juice', 'cereal', 'milk'],
            'lunch': ['sandwich bread', 'deli meat', 'cheese', 'lettuce', 'mayo'],
            'dinner': ['chicken', 'vegetables', 'rice', 'pasta', 'sauce'],
            'party': ['chips', 'dip', 'soda', 'pizza', 'ice cream', 'paper plates'],
            'baking': ['flour', 'sugar', 'eggs', 'butter', 'vanilla', 'baking powder'],
            'healthy': ['fruits', 'vegetables', 'nuts', 'yogurt', 'whole grains'],
            'quick meal': ['pasta', 'canned sauce', 'frozen vegetables', 'pre-cooked chicken']
        };

        const items = occasionMap[occasion.toLowerCase()] || [];
        return items.map(item => ({
            name: item,
            reason: `Good for ${occasion}`,
            type: 'occasion',
            priority: 2
        }));
    }

    // Render suggestions in the UI
    renderSuggestions(suggestions) {
        const suggestionsContainer = document.getElementById('suggestions');
        if (!suggestionsContainer) return;

        if (!suggestions || suggestions.length === 0) {
            suggestionsContainer.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="fas fa-lightbulb fa-2x mb-2"></i>
                    <p>No suggestions available.<br>Add items to get smart recommendations!</p>
                </div>
            `;
            return;
        }

        // Sort suggestions by priority (lower number = higher priority)
        const sortedSuggestions = suggestions.sort((a, b) => a.priority - b.priority);

        const suggestionsHTML = sortedSuggestions.map(suggestion => `
            <div class="suggestion-item" data-item="${suggestion.name}" onclick="window.aiSuggestions.addSuggestedItem('${suggestion.name}')">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="flex-grow-1">
                        <div class="fw-medium">${suggestion.name}</div>
                        <div class="suggestion-reason text-muted">${suggestion.reason}</div>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-${this.getPriorityColor(suggestion.priority)} rounded-pill">${suggestion.priority}</span>
                        <button class="btn btn-sm btn-outline-primary ms-2" onclick="event.stopPropagation(); window.aiSuggestions.addSuggestedItem('${suggestion.name}')">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        suggestionsContainer.innerHTML = `
            <div class="mb-3">
                <small class="text-muted">
                    <i class="fas fa-info-circle"></i> 
                    Click items to add to your list. Priority: 1 = most recommended, 5 = optional
                </small>
            </div>
            ${suggestionsHTML}
        `;
    }

    // Get priority color for badges
    getPriorityColor(priority) {
        switch (priority) {
            case 1: return 'success';
            case 2: return 'primary';
            case 3: return 'info';
            case 4: return 'warning';
            case 5: return 'secondary';
            default: return 'secondary';
        }
    }

    // Add suggested item to shopping list
    async addSuggestedItem(itemName) {
        try {
            const parsedCommand = {
                action: 'add',
                item: itemName,
                quantity: 1,
                category: window.voiceHandler ? window.voiceHandler.categorizeItem(itemName) : 'Other'
            };

            if (window.shoppingApp) {
                await window.shoppingApp.addItem(parsedCommand);
                
                // Show success notification
                this.showNotification(`Added ${itemName} to your list!`, 'success');
                
                // Refresh suggestions
                setTimeout(() => {
                    this.refreshSuggestions();
                }, 1000);
            }
        } catch (error) {
            console.error('Error adding suggested item:', error);
            this.showNotification('Error adding item to list', 'error');
        }
    }

    // Refresh suggestions based on current list
    async refreshSuggestions() {
        try {
            if (window.shoppingApp) {
                const currentItems = await window.shoppingApp.getItems();
                const userHistory = this.getUserHistory();
                const suggestions = await this.generateSuggestions(currentItems, userHistory);
                const filteredSuggestions = this.filterSuggestionsByPreferences(suggestions);
                this.renderSuggestions(filteredSuggestions);
            }
        } catch (error) {
            console.error('Error refreshing suggestions:', error);
        }
    }

    // Get user history from local storage or database
    getUserHistory() {
        try {
            const history = localStorage.getItem('shopping_history');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Error loading user history:', error);
            return [];
        }
    }

    // Add item to user history
    addToHistory(item) {
        try {
            const history = this.getUserHistory();
            const historyItem = {
                name: item.name || item,
                category: item.category || 'Other',
                quantity: item.quantity || 1,
                addedAt: new Date().toISOString()
            };
            
            history.unshift(historyItem);
            
            // Keep only last 100 items
            const limitedHistory = history.slice(0, 100);
            localStorage.setItem('shopping_history', JSON.stringify(limitedHistory));
        } catch (error) {
            console.error('Error adding to history:', error);
        }
    }

    // Search for items with AI assistance
    async searchItems(query, options = {}) {
        try {
            const suggestions = await this.getSearchSuggestions(query, options);
            this.renderSearchResults(suggestions, query);
        } catch (error) {
            console.error('Error searching items:', error);
            this.showNotification('Search failed. Please try again.', 'error');
        }
    }

    // Get search suggestions
    async getSearchSuggestions(query, options) {
        // Try AI-powered search first
        if (this.apiKey || this.loadApiKey()) {
            const aiResults = await this.getAISearchSuggestions(query, options);
            if (aiResults.length > 0) {
                return aiResults;
            }
        }
        
        // Fallback to basic search
        return this.getBasicSearchResults(query, options);
    }

    // AI-powered search suggestions
    async getAISearchSuggestions(query, options) {
        try {
            const apiKey = this.apiKey || this.loadApiKey();
            if (!apiKey) return [];

            const prompt = `
User is searching for: "${query}"
${options.priceRange ? `Price range: ${options.priceRange}` : ''}
${options.brand ? `Preferred brand: ${options.brand}` : ''}

Suggest 5-8 specific product variations and alternatives that match this search.
Consider different brands, sizes, and related items.

Respond in JSON format:
[
  {"name": "specific product name", "reason": "why it matches", "category": "product category"}
]
            `.trim();

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 300,
                    temperature: 0.5
                })
            });

            if (!response.ok) return [];

            const data = await response.json();
            return this.parseAISuggestions(data.choices[0].message.content);

        } catch (error) {
            console.error('AI search failed:', error);
            return [];
        }
    }

    // Basic search without AI
    getBasicSearchResults(query, options) {
        const commonItems = [
            'milk', 'bread', 'eggs', 'butter', 'cheese', 'chicken', 'beef', 'fish',
            'apples', 'bananas', 'oranges', 'tomatoes', 'lettuce', 'onions', 'potatoes',
            'rice', 'pasta', 'cereal', 'yogurt', 'juice', 'water', 'coffee', 'tea'
        ];

        const queryLower = query.toLowerCase();
        const matchingItems = commonItems.filter(item => 
            item.includes(queryLower) || queryLower.includes(item)
        );

        return matchingItems.slice(0, 8).map(item => ({
            name: item,
            reason: `Matches "${query}"`,
            category: window.voiceHandler ? window.voiceHandler.categorizeItem(item) : 'Other'
        }));
    }

    // Render search results in modal
    renderSearchResults(results, query) {
        const searchModal = document.getElementById('searchModal');
        const searchResults = document.getElementById('searchResults');
        
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-search fa-3x mb-3"></i>
                    <p>No results found for "${query}"</p>
                    <small>Try a different search term or add it manually</small>
                </div>
            `;
        } else {
            const resultsHTML = results.map(item => `
                <div class="search-result-item border rounded p-3 mb-2 cursor-pointer" 
                     onclick="window.aiSuggestions.addSuggestedItem('${item.name}')">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${item.name}</h6>
                            <small class="text-muted">${item.reason}</small>
                            ${item.category ? `<span class="badge bg-secondary ms-2">${item.category}</span>` : ''}
                        </div>
                        <button class="btn btn-primary btn-sm">
                            <i class="fas fa-plus"></i> Add
                        </button>
                    </div>
                </div>
            `).join('');

            searchResults.innerHTML = resultsHTML;
        }

        // Show modal if using Bootstrap
        if (window.bootstrap && searchModal) {
            const modal = new bootstrap.Modal(searchModal);
            modal.show();
        }
    }

    // Show notification helper
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 1050;
            min-width: 300px;
            animation: fadeInUp 0.5s ease;
        `;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
            <button type="button" class="btn-close float-end" onclick="this.parentElement.remove()"></button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // API key configuration helper
    promptForApiKey() {
        const apiKey = prompt('Enter your OpenAI API key for enhanced suggestions (optional):');
        if (apiKey && apiKey.trim()) {
            this.setApiKey(apiKey.trim());
            this.showNotification('API key saved! Enhanced suggestions enabled.', 'success');
            return true;
        }
        return false;
    }

    // Initialize suggestions on page load
    async initialize() {
        console.log('🤖 AI Suggestions initialized');
        
        // Load initial suggestions
        setTimeout(() => {
            this.refreshSuggestions();
        }, 2000);
        
        // Show API key prompt if not configured
        if (!this.loadApiKey()) {
            setTimeout(() => {
                const userWantsApi = confirm('Would you like to configure OpenAI API key for enhanced AI suggestions?');
                if (userWantsApi) {
                    this.promptForApiKey();
                }
            }, 5000);
        }
    }
}

// Create and export AI suggestions instance
const aiSuggestions = new AISuggestions();

// Make it globally accessible
window.aiSuggestions = aiSuggestions;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => aiSuggestions.initialize());
} else {
    aiSuggestions.initialize();
}

export default aiSuggestions; Initialize API key
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        localStorage.setItem('openai_api_key', apiKey);
    }

    // Load API key from storage
    loadApiKey() {
        return localStorage.getItem('openai_api_key');
    }

    // Generate smart suggestions based on current list and history
    async generateSuggestions(currentItems = [], userHistory = []) {
        try {
            // Try AI suggestions first
            if (this.apiKey || this.loadApiKey()) {
                const aiSuggestions = await this.getAISuggestions(currentItems, userHistory);
                if (aiSuggestions.length > 0) {
                    return aiSuggestions;
                }
            }
            
            // Fallback to rule-based suggestions
            return this.getRuleBasedSuggestions(currentItems, userHistory);
        } catch (error) {
            console.error('Error generating suggestions:', error);
            return this.getRuleBasedSuggestions(currentItems, userHistory);
        }
    }

    // Get AI-powered suggestions using OpenAI
    async getAISuggestions(currentItems, userHistory) {
        try {
            const apiKey = this.apiKey || this.loadApiKey();
            if (!apiKey) {
                throw new Error('OpenAI API key not configured');
            }

            const prompt = this.buildAIPrompt(currentItems, userHistory);
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: 200,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const suggestions = this.parseAISuggestions(data.choices[0].message.content);
            
            return suggestions.map(item => ({
                name: item.name,
                reason: item.reason || 'AI recommendation',
                type: 'ai',
                priority: item.priority || 3
            }));

        } catch (error) {
            console.error('AI suggestions failed:', error);
            return [];
        }
    }

    // Build prompt for AI suggestions
    buildAIPrompt(currentItems, userHistory) {
        const currentList = currentItems.map(item => item.name || item).join(', ');
        const historyList = userHistory.slice(-20).map(item => item.name || item).join(', ');
        const currentDate = new Date().toLocaleDateString();
        
        return `
You are a smart shopping assistant. Based on the current shopping list and purchase history, suggest 5-7 complementary items that the user might need.

Current shopping list: ${currentList || 'empty'}
Recent purchase history: ${historyList || 'none'}
Current date: ${currentDate}

Consider:
1. Items that commonly go together (milk → cereal, pasta → sauce)
2. Seasonal produce and items
3. Household essentials that might be running low
4. Healthy alternatives and substitutes

Respond in this exact JSON format:
[
  {"name": "item name", "reason": "brief reason", "priority": 1-5},
  {"name": "item name", "reason": "brief reason", "priority": 1-5}
]

Priority: 1=very likely needed, 5=nice to have
Keep item names simple and generic.
        `.trim();
    }

    // Parse AI response into structured suggestions
    parseAISuggestions(aiResponse) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const suggestions = JSON.parse(jsonMatch[0]);
                return suggestions.filter(item => item.name && item.name.length > 0);
            }
            
            // Fallback: parse line by line
            const lines = aiResponse.split('\n').filter(line => line.trim());
            const suggestions = [];
            
            for (const line of lines) {
                const match = line.match(/[-*]\s*([^(]+)(?:\(([^)]+)\))?/);
                if (match) {
                    suggestions.push({
                        name: match[1].trim(),
                        reason: match[2] || 'AI recommendation',
                        priority: 3
                    });
                }
            }
            
            return suggestions;
        } catch (error) {
            console.error('Error parsing AI suggestions:', error);
            return [];
        }
    }

    // Rule-based suggestions when AI is not available
    getRuleBasedSuggestions(currentItems, userHistory) {
        const suggestions = [];
        const currentNames = currentItems.map(item => (item.name || item).toLowerCase());
        
        // Complementary items based on current list
        const complementaryItems = this.getComplementaryItems(currentNames);
        suggestions.push(...complementaryItems);
        
        // Seasonal suggestions
        const seasonal = this.getSeasonalSuggestions();
        suggestions.push(...seasonal);
        
        // Frequent items not in current list
        const frequent = this.getFrequentItems(userHistory, currentNames);
        suggestions.push(...frequent);
        
        // Common household essentials
        const essentials = this.getHouseholdEssentials(currentNames);
        suggestions.push(...essentials);
        
        // Remove duplicates and limit to 6 items
        const uniqueSuggestions = suggestions
            .filter((item, index, self) => 
                index === self.findIndex(s => s.name.toLowerCase() === item.name.toLowerCase())
            )
            .slice(0, 6);
            
        return uniqueSuggestions;
    }

    // Get complementary items based on current list
    getComplementaryItems(currentNames) {
        const complementaryMap = {
            'milk': ['cereal', 'cookies', 'coffee'],
            'bread': ['butter', 'jam', 'lunch meat'],
            'pasta': ['pasta sauce', 'parmesan cheese', 'garlic'],
            'chicken': ['vegetables', 'rice', 'seasoning'],
            'eggs': ['bacon', 'bread', 'cheese'],
            'coffee': ['cream', 'sugar', 'pastries'],
            'salad': ['dressing', 'croutons', 'tomatoes'],
            'pizza': ['soda', 'salad', 'ice cream'],
            'rice': ['soy sauce', 'vegetables', 'chicken'],
            'bananas': ['peanut butter', 'oats', 'yogurt']
        };
        
        const suggestions = [];
        
        for (const currentItem of currentNames) {
            for (const [key, complements] of Object.entries(complementaryMap)) {
                if (currentItem.includes(key)) {
                    for (const complement of complements) {
                        if (!currentNames.some(name => name.includes(complement))) {
                            suggestions.push({
                                name: complement,
                                reason: `Goes well with ${key}`,
                                type: 'complementary',
                                priority: 2
                            });
                        }
                    }
                }
            }
        }
        
        return suggestions.slice(0, 3);
    }

    // Get seasonal item suggestions
    getSeasonalSuggestions() {
        const currentSeason = this.getCurrentSeason();
        const seasonalItems = this.seasonalItems[currentSeason] || [];
        
        return seasonalItems.slice(0, 2).map(item => ({
            name: item,
            reason: `${currentSeason} seasonal item`,
            type: 'seasonal',
            priority: 3
        }));
    }

    // Get frequently purchased items not in current list
    getFrequentItems(userHistory, currentNames) {
        const itemFrequency = {};
        
        // Count frequency of items in history
        userHistory.forEach(item => {
            const name = (item.name || item).toLowerCase();
            itemFrequency[name] = (itemFrequency[name] || 0) + 1;
        });
        
        // Sort by frequency and filter out current items
        const frequentItems = Object.entries(itemFrequency)
            .filter(([name, count]) => count >= 2 && !currentNames.includes(name))
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2);
            
        return frequentItems.map(([name, count]) => ({
            name: name,
            reason: `Frequently purchased (${count} times)`,
            type: 'frequent',
            priority: 2
        }));
    }

    // Get household essentials suggestions
    getHouseholdEssentials(currentNames) {
        const essentials = [
            'toilet paper', 'paper towels', 'dish soap', 'laundry detergent',
            'toothpaste', 'shampoo', 'hand soap', 'tissues'
        ];
        
        const suggestions = essentials
            .filter(item => !currentNames.some(name => name.includes(item)))
            .slice(0, 2)
            .map(item => ({
                name: item,
                reason: 'Household essential',
                type: 'essential',
                priority: 4
            }));
            
        return suggestions;
    }

    // Get substitutes for unavailable items
    getSuggestionSubstitutes(itemName) {
        const substitutes = this.commonSubstitutes[itemName.toLowerCase()] || [];
        return substitutes.map(sub => ({
            name: sub,
            reason: `Alternative to ${itemName}`,
            type: 'substitute',
            priority: 2
        }));
    }

    // Get current season
    getCurrentSeason() {
        const month = new Date().getMonth();
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'fall';
        return 'winter';
    }

    // Load seasonal items data
    getSeasonalItems() {
        return {
            spring: ['asparagus', 'strawberries', 'artichokes', 'peas', 'spring onions'],
            summer: ['tomatoes', 'corn', 'watermelon', 'berries', 'zucchini', 'peaches'],
            fall: ['pumpkins', 'apples', 'squash', 'sweet potatoes', 'cranberries'],
            winter: ['citrus fruits', 'root vegetables', 'cabbage', 'pomegranates', 'winter squash']
        };
    }

    // Load common substitutes
    loadCommonSubstitutes() {
        return {
            'milk': ['almond milk', 'oat milk', 'soy milk', 'coconut milk'],
            'butter': ['margarine', 'olive oil', 'coconut oil'],
            'sugar': ['honey', 'maple syrup', 'stevia', 'brown sugar'],
            'eggs': ['egg substitute', 'flax eggs', 'applesauce'],
            'bread': ['tortillas', 'rice cakes', 'bagels', 'pita bread'],
            'pasta': ['rice', 'quinoa', 'zucchini noodles', 'rice noodles'],
            'chicken': ['tofu', 'turkey', 'fish', 'beans'],
            'beef': ['turkey', 'chicken', 'plant-based meat', 'mushrooms']
        };
    }

    // Load fallback suggestions for when AI is unavailable
    loadFallbackSuggestions() {
        return [
            { name: 'bananas', reason: 'Healthy snack', priority: 3 },
            { name: 'milk', reason: 'Kitchen staple', priority: 2 },
            { name: 'bread', reason: 'Versatile basic', priority: 2 },
            { name: 'eggs', reason: 'Protein source', priority: 3 },
            { name: 'apples', reason: 'Fresh fruit', priority: 3 },
            { name: 'yogurt', reason: 'Healthy breakfast', priority: 3 }
        ];
    }

    // Load user preferences from storage
    loadUserPreferences() {
        try {
            const prefs = localStorage.getItem('user_shopping_preferences');
            return prefs ? JSON.parse(prefs) : {
                dietary: [],
                dislikes: [],
                preferredBrands: [],
                budgetRange: 'medium'
            };
        } catch (error) {
            console.error('Error loading preferences:', error);
            return { dietary: [], dislikes: [], preferredBrands: [], budgetRange: 'medium' };
        }
    }

    // Save user preferences
    saveUserPreferences(preferences) {
        try {
            localStorage.setItem('user_shopping_preferences', JSON.stringify(preferences));
            this.userPreferences = preferences;
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    // Filter suggestions based on user preferences
    filterSuggestionsByPreferences(suggestions) {
        return suggestions.filter(suggestion => {
            // Filter out disliked items
            if (this.userPreferences.dislikes.some(dislike => 
                suggestion.name.toLowerCase().includes(dislike.toLowerCase()))) {
                return false;
            }
            
            // Apply dietary restrictions
            if (this.userPreferences.dietary.includes('vegetarian')) {
                const meatItems = ['chicken', 'beef', 'pork', 'fish', 'turkey', 'meat'];
                if (meatItems.some(meat => suggestion.name.toLowerCase().includes(meat))) {
                    return false;
                }
            }
            
            if (this.userPreferences.dietary.includes('vegan')) {
                const animalProducts = ['milk', 'cheese', 'butter', 'eggs', 'yogurt', 'cream'];
                if (animalProducts.some(product => suggestion.name.toLowerCase().includes(product))) {
                    return false;
                }
            }
            
            return true;
        });
    }

    // Get price-based suggestions
    async getPriceSuggestions(query, priceRange = 'any') {
        // This would integrate with a price API in a real application
        // For now, return mock price-filtered suggestions
        const priceCategories = {
            'low': ['generic brand items', 'seasonal produce', 'bulk items'],
            'medium': ['name brand basics', 'fresh produce', 'standard items'],
            'high': ['organic items', 'premium brands', 'specialty products']
        };
        
        const suggestions = priceCategories[priceRange] || priceCategories['medium'];
        
        return suggestions.map(item => ({
            name: item,
            reason: `${priceRange} price range`,
            type: 'price-filtered',
            priority: 3
        }));
    }

    //