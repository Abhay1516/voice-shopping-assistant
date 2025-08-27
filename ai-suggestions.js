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

    // ---------- API Key Helpers ----------
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        localStorage.setItem('openai_api_key', apiKey);
    }

    loadApiKey() {
        return localStorage.getItem('openai_api_key');
    }

    // ---------- Core Suggestion Logic ----------
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

    async getAISuggestions(currentItems, userHistory) {
        try {
            const apiKey = this.apiKey || this.loadApiKey();
            if (!apiKey) throw new Error('OpenAI API key not configured');

            const prompt = this.buildAIPrompt(currentItems, userHistory);

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 200,
                    temperature: 0.7
                })
            });

            if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

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

    buildAIPrompt(currentItems, userHistory) {
        const currentList = currentItems.map(item => item.name || item).join(', ');
        const historyList = userHistory.slice(-20).map(item => item.name || item).join(', ');
        const currentDate = new Date().toLocaleDateString();

        return `
You are a smart shopping assistant. Based on the current shopping list and purchase history, suggest 5-7 complementary items.

Current shopping list: ${currentList || 'empty'}
Recent purchase history: ${historyList || 'none'}
Current date: ${currentDate}

Respond in JSON:
[
  {"name": "item name", "reason": "brief reason", "priority": 1-5}
]
        `.trim();
    }

    parseAISuggestions(aiResponse) {
        try {
            const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]).filter(item => item.name);
            }
            return [];
        } catch (error) {
            console.error('Error parsing AI suggestions:', error);
            return [];
        }
    }

    // ---------- Rule-based Suggestions ----------
    getRuleBasedSuggestions(currentItems, userHistory) {
        const suggestions = [];
        const currentNames = currentItems.map(item => (item.name || item).toLowerCase());

        suggestions.push(...this.getComplementaryItems(currentNames));
        suggestions.push(...this.getSeasonalSuggestions());
        suggestions.push(...this.getFrequentItems(userHistory, currentNames));
        suggestions.push(...this.getHouseholdEssentials(currentNames));

        return suggestions
            .filter((item, index, self) =>
                index === self.findIndex(s => s.name.toLowerCase() === item.name.toLowerCase())
            )
            .slice(0, 6);
    }

    getComplementaryItems(currentNames) {
        const complementaryMap = {
            'milk': ['cereal', 'cookies', 'coffee'],
            'bread': ['butter', 'jam', 'lunch meat'],
            'pasta': ['pasta sauce', 'parmesan cheese', 'garlic'],
            'chicken': ['vegetables', 'rice', 'seasoning']
        };

        const suggestions = [];
        for (const currentItem of currentNames) {
            for (const [key, complements] of Object.entries(complementaryMap)) {
                if (currentItem.includes(key)) {
                    complements.forEach(complement => {
                        if (!currentNames.includes(complement)) {
                            suggestions.push({
                                name: complement,
                                reason: `Goes well with ${key}`,
                                type: 'complementary',
                                priority: 2
                            });
                        }
                    });
                }
            }
        }
        return suggestions.slice(0, 3);
    }

    getSeasonalSuggestions() {
        const currentSeason = this.getCurrentSeason();
        return (this.seasonalItems[currentSeason] || []).slice(0, 2).map(item => ({
            name: item,
            reason: `${currentSeason} seasonal item`,
            type: 'seasonal',
            priority: 3
        }));
    }

    getFrequentItems(userHistory, currentNames) {
        const itemFrequency = {};
        userHistory.forEach(item => {
            const name = (item.name || item).toLowerCase();
            itemFrequency[name] = (itemFrequency[name] || 0) + 1;
        });

        return Object.entries(itemFrequency)
            .filter(([name, count]) => count >= 2 && !currentNames.includes(name))
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2)
            .map(([name, count]) => ({
                name,
                reason: `Frequently purchased (${count} times)`,
                type: 'frequent',
                priority: 2
            }));
    }

    getHouseholdEssentials(currentNames) {
        const essentials = ['toilet paper', 'paper towels', 'dish soap', 'laundry detergent'];
        return essentials
            .filter(item => !currentNames.includes(item))
            .slice(0, 2)
            .map(item => ({
                name: item,
                reason: 'Household essential',
                type: 'essential',
                priority: 4
            }));
    }

    // ---------- Data Loaders ----------
    getCurrentSeason() {
        const month = new Date().getMonth();
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'fall';
        return 'winter';
    }

    getSeasonalItems() {
        return {
            spring: ['asparagus', 'strawberries', 'peas'],
            summer: ['tomatoes', 'corn', 'watermelon'],
            fall: ['pumpkins', 'apples', 'squash'],
            winter: ['citrus fruits', 'root vegetables', 'cabbage']
        };
    }

    loadCommonSubstitutes() {
        return {
            milk: ['almond milk', 'soy milk'],
            butter: ['margarine', 'olive oil'],
            eggs: ['flax eggs', 'applesauce']
        };
    }

    loadFallbackSuggestions() {
        return [
            { name: 'bananas', reason: 'Healthy snack', priority: 3 },
            { name: 'milk', reason: 'Kitchen staple', priority: 2 }
        ];
    }

    loadUserPreferences() {
        try {
            const prefs = localStorage.getItem('user_shopping_preferences');
            return prefs ? JSON.parse(prefs) : { dietary: [], dislikes: [] };
        } catch {
            return { dietary: [], dislikes: [] };
        }
    }
}

// Create and export AI suggestions instance
const aiSuggestions = new AISuggestions();
window.aiSuggestions = aiSuggestions;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => aiSuggestions.initialize?.());
} else {
    aiSuggestions.initialize?.();
}

export default aiSuggestions;
