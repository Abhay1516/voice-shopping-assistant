// Main Shopping Assistant Application
class ShoppingApp {
    constructor() {
        this.items = [];
        this.categories = {};
        this.isLoading = false;
        
        this.initializeApp();
    }

    // Initialize the application
    async initializeApp() {
        try {
            console.log('🛒 Shopping Assistant starting...');
            
            // Wait for dependencies to load
            await this.waitForDependencies();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load existing items
            await this.loadItems();
            
            // Update UI
            this.updateUI();
            
            // Show app status
            this.showAppStatus();
            
            console.log('✅ Shopping Assistant initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Shopping Assistant:', error);
            this.showError('Failed to initialize the application. Please refresh the page.');
        }
    }

    // Wait for dependencies to load
    async waitForDependencies() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (attempts < maxAttempts) {
            if (window.shoppingDB && window.voiceHandler && window.aiSuggestions) {
                return Promise.resolve();
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('Dependencies failed to load within timeout');
    }

    // Setup event listeners
    setupEventListeners() {
        // Clear all button
        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllItems());
        }

        // Save list button
        const saveListBtn = document.getElementById('saveListBtn');
        if (saveListBtn) {
            saveListBtn.addEventListener('click', () => this.saveList());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Space to start voice recognition
            if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
                e.preventDefault();
                if (window.voiceHandler) {
                    window.voiceHandler.toggleVoiceRecognition();
                }
            }
        });

        console.log('📱 Event listeners setup complete');
    }

    // Add item to shopping list
    async addItem(itemData) {
        try {
            this.showLoading(true);
            
            // Validate item data
            if (!itemData.item || itemData.item.trim() === '') {
                throw new Error('Item name is required');
            }

            // Check for duplicates
            const existingItem = this.items.find(item => 
                item.name.toLowerCase() === itemData.item.toLowerCase()
            );

            if (existingItem) {
                // Update quantity instead of adding duplicate
                const newQuantity = existingItem.quantity + (itemData.quantity || 1);
                await this.updateItemQuantity(existingItem.id, newQuantity);
                this.showSuccess(`Updated ${itemData.item} quantity to ${newQuantity}`);
                return existingItem;
            }

            // Create new item
            const newItem = {
                name: itemData.item,
                quantity: itemData.quantity || 1,
                category: itemData.category || 'Other',
                completed: false,
                priority: itemData.priority || 3,
                addedAt: new Date().toISOString()
            };

            // Add to database
            const addedItem = await window.shoppingDB.addItem(newItem);
            
            // Add to local array
            this.items.push(addedItem);
            
            // Update categories
            this.updateCategories();
            
            // Update UI
            this.updateUI();
            
            // Add to history for AI suggestions
            if (window.aiSuggestions) {
                window.aiSuggestions.addToHistory(addedItem);
            }

            console.log('✅ Item added:', addedItem);
            return addedItem;

        } catch (error) {
            console.error('❌ Error adding item:', error);
            this.showError(`Failed to add ${itemData.item}: ${error.message}`);
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    // Remove item from shopping list
    async removeItem(itemName) {
        try {
            this.showLoading(true);
            
            const itemToRemove = this.items.find(item => 
                item.name.toLowerCase().includes(itemName.toLowerCase())
            );

            if (!itemToRemove) {
                this.showError(`Item "${itemName}" not found in your list`);
                return false;
            }

            // Remove from database
            await window.shoppingDB.deleteItem(itemToRemove.id);
            
            // Remove from local array
            this.items = this.items.filter(item => item.id !== itemToRemove.id);
            
            // Update categories
            this.updateCategories();
            
            // Update UI
            this.updateUI();

            console.log('✅ Item removed:', itemToRemove);
            return true;

        } catch (error) {
            console.error('❌ Error removing item:', error);
            this.showError(`Failed to remove ${itemName}: ${error.message}`);
            return false;
        } finally {
            this.showLoading(false);
        }
    }

    // Toggle item completion status
    async toggleItemCompletion(itemId) {
        try {
            const item = this.items.find(i => i.id === itemId);
            if (!item) return false;

            const newStatus = !item.completed;
            
            // Update in database
            await window.shoppingDB.updateItem(itemId, { completed: newStatus });
            
            // Update local array
            item.completed = newStatus;
            
            // Update UI
            this.renderShoppingList();

            return true;

        } catch (error) {
            console.error('❌ Error toggling item:', error);
            this.showError('Failed to update item status');
            return false;
        }
    }

    // Update item quantity
    async updateItemQuantity(itemId, newQuantity) {
        try {
            if (newQuantity <= 0) {
                // Remove item if quantity is 0 or negative
                const item = this.items.find(i => i.id === itemId);
                if (item) {
                    return await this.removeItem(item.name);
                }
                return false;
            }

            // Update in database
            await window.shoppingDB.updateItem(itemId, { quantity: newQuantity });
            
            // Update local array
            const item = this.items.find(i => i.id === itemId);
            if (item) {
                item.quantity = newQuantity;
            }
            
            // Update UI
            this.renderShoppingList();

            return true;

        } catch (error) {
            console.error('❌ Error updating quantity:', error);
            this.showError('Failed to update item quantity');
            return false;
        }
    }

    // Load items from database
    async loadItems() {
        try {
            this.showLoading(true);
            
            this.items = await window.shoppingDB.getItems();
            this.updateCategories();
            
            console.log(`📦 Loaded ${this.items.length} items from database`);

        } catch (error) {
            console.error('❌ Error loading items:', error);
            this.showError('Failed to load shopping list');
            this.items = []; // Fallback to empty list
        } finally {
            this.showLoading(false);
        }
    }

    // Get all items
    getItems() {
        return [...this.items]; // Return copy to prevent direct modification
    }

    // Search items
    async searchItems(query) {
        try {
            if (window.aiSuggestions) {
                await window.aiSuggestions.searchItems(query);
            } else {
                // Fallback search in current list
                const matches = this.items.filter(item =>
                    item.name.toLowerCase().includes(query.toLowerCase())
                );
                
                if (matches.length > 0) {
                    this.showSuccess(`Found ${matches.length} matching items in your list`);
                } else {
                    this.showError(`No items found matching "${query}"`);
                }
            }
        } catch (error) {
            console.error('❌ Search error:', error);
            this.showError('Search failed. Please try again.');
        }
    }

    // Clear all items
    async clearAllItems() {
        try {
            const confirmClear = confirm('Are you sure you want to clear your entire shopping list?');
            if (!confirmClear) return;

            this.showLoading(true);
            
            // Clear from database
            await window.shoppingDB.clearAllItems();
            
            // Clear local array
            this.items = [];
            this.categories = {};
            
            // Update UI
            this.updateUI();
            
            this.showSuccess('Shopping list cleared successfully');
            console.log('🗑️ All items cleared');

        } catch (error) {
            console.error('❌ Error clearing items:', error);
            this.showError('Failed to clear shopping list');
        } finally {
            this.showLoading(false);
        }
    }

    // Save/export shopping list
    saveList() {
        try {
            const listData = {
                items: this.items,
                categories: this.categories,
                exportedAt: new Date().toISOString(),
                totalItems: this.items.length,
                completedItems: this.items.filter(item => item.completed).length
            };

            const dataStr = JSON.stringify(listData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `shopping-list-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.showSuccess('Shopping list exported successfully');

        } catch (error) {
            console.error('❌ Export error:', error);
            this.showError('Failed to export shopping list');
        }
    }

    // Update categories based on current items
    updateCategories() {
        this.categories = {};
        
        this.items.forEach(item => {
            const category = item.category || 'Other';
            if (!this.categories[category]) {
                this.categories[category] = [];
            }
            this.categories[category].push(item);
        });

        this.renderCategories();
    }

    // Render shopping list in UI
    renderShoppingList() {
        const listContainer = document.getElementById('shoppingList');
        const emptyState = document.getElementById('emptyState');
        const itemCount = document.getElementById('itemCount');

        if (!listContainer) return;

        if (this.items.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            listContainer.innerHTML = '';
            if (itemCount) itemCount.textContent = '0 items';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Sort items: incomplete first, then by category, then by name
        const sortedItems = [...this.items].sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
            }
            return a.name.localeCompare(b.name);
        });

        const itemsHTML = sortedItems.map(item => `
            <div class="shopping-item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
                <div class="d-flex align-items-center">
                    <div class="form-check me-3">
                        <input class="form-check-input" type="checkbox" 
                               id="item-${item.id}" 
                               ${item.completed ? 'checked' : ''}
                               onchange="window.shoppingApp.toggleItemCompletion('${item.id}')">
                    </div>
                    
                    <div class="item-details flex-grow-1">
                        <div class="item-name">${item.name}</div>
                        <div class="d-flex align-items-center gap-2 mt-1">
                            <span class="item-category">${item.category}</span>
                            ${item.quantity > 1 ? `<span class="item-quantity">Qty: ${item.quantity}</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="item-actions">
                        <button class="btn btn-outline-secondary btn-sm rounded-circle me-1" 
                                onclick="window.shoppingApp.updateItemQuantity('${item.id}', ${item.quantity - 1})"
                                title="Decrease quantity">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button class="btn btn-outline-primary btn-sm rounded-circle me-1" 
                                onclick="window.shoppingApp.updateItemQuantity('${item.id}', ${item.quantity + 1})"
                                title="Increase quantity">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm rounded-circle" 
                                onclick="window.shoppingApp.removeItem('${item.name}')"
                                title="Remove item">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        listContainer.innerHTML = itemsHTML;

        // Update item count
        if (itemCount) {
            const completed = this.items.filter(item => item.completed).length;
            const total = this.items.length;
            itemCount.textContent = `${total} items (${completed} completed)`;
        }
    }

    // Render categories
    renderCategories() {
        const categoriesContainer = document.getElementById('categories');
        if (!categoriesContainer || Object.keys(this.categories).length === 0) {
            if (categoriesContainer) {
                categoriesContainer.innerHTML = '<p class="text-muted small">Add items to see categories</p>';
            }
            return;
        }

        const categoriesHTML = Object.entries(this.categories)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, items]) => `
                <span class="category-tag" onclick="window.shoppingApp.filterByCategory('${category}')">
                    ${category} (${items.length})
                </span>
            `).join('');

        categoriesContainer.innerHTML = categoriesHTML;
    }

    // Filter items by category (future enhancement)
    filterByCategory(category) {
        // For now, just show a message
        this.showSuccess(`Showing items in category: ${category}`);
        // Could implement actual filtering in the future
    }

    // Update entire UI
    updateUI() {
        this.renderShoppingList();
        this.updateCategories();
        
        // Enable/disable buttons based on list state
        const clearAllBtn = document.getElementById('clearAllBtn');
        const saveListBtn = document.getElementById('saveListBtn');
        
        const hasItems = this.items.length > 0;
        
        if (clearAllBtn) {
            clearAllBtn.disabled = !hasItems;
        }
        
        if (saveListBtn) {
            saveListBtn.disabled = !hasItems;
        }
    }

    // Show/hide loading overlay
    showLoading(show = true) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.classList.remove('d-none');
            } else {
                loadingOverlay.classList.add('d-none');
            }
        }
        this.isLoading = show;
    }

    // Show success notification
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    // Show error notification
    showError(message) {
        this.showNotification(message, 'error');
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} position-fixed`;
        notification.style.cssText = `
            top: 80px;
            right: 20px;
            z-index: 1060;
            min-width: 300px;
            max-width: 400px;
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

    // Show app status and information
    showAppStatus() {
        const status = window.firebaseStatus || { storageType: 'Unknown' };
        console.log(`🔧 Storage: ${status.storageType}`);
        
        // Show welcome message after a short delay
        setTimeout(() => {
            this.showSuccess(`Welcome! Using ${status.storageType} for data storage. ${this.items.length > 0 ? `Loaded ${this.items.length} items.` : 'Start by adding items with voice or typing!'}`);
        }, 1000);
    }

    // Get app statistics
    getStatistics() {
        const completed = this.items.filter(item => item.completed).length;
        const byCategory = {};
        
        this.items.forEach(item => {
            const category = item.category || 'Other';
            byCategory[category] = (byCategory[category] || 0) + 1;
        });

        return {
            totalItems: this.items.length,
            completedItems: completed,
            pendingItems: this.items.length - completed,
            categories: Object.keys(this.categories).length,
            itemsByCategory: byCategory,
            completionRate: this.items.length > 0 ? Math.round((completed / this.items.length) * 100) : 0
        };
    }

    // Export statistics
    exportStatistics() {
        const stats = this.getStatistics();
        console.table(stats.itemsByCategory);
        return stats;
    }

    // Handle app errors gracefully
    handleError(error, context = 'Unknown') {
        console.error(`❌ Error in ${context}:`, error);
        
        // Show user-friendly error message
        let userMessage = 'An error occurred. Please try again.';
        
        if (error.message) {
            if (error.message.includes('network') || error.message.includes('fetch')) {
                userMessage = 'Network error. Please check your internet connection.';
            } else if (error.message.includes('permission')) {
                userMessage = 'Permission denied. Please check your browser settings.';
            } else if (error.message.includes('storage')) {
                userMessage = 'Storage error. Your browser storage might be full.';
            }
        }
        
        this.showError(userMessage);
        
        // Log error for debugging
        if (window.console && console.groupCollapsed) {
            console.groupCollapsed(`🐛 Error Details - ${context}`);
            console.error('Error object:', error);
            console.error('Stack trace:', error.stack);
            console.error('Context:', context);
            console.error('App state:', {
                itemsCount: this.items.length,
                isLoading: this.isLoading,
                categories: Object.keys(this.categories)
            });
            console.groupEnd();
        }
    }

    // Cleanup and reset app
    reset() {
        this.items = [];
        this.categories = {};
        this.isLoading = false;
        this.updateUI();
        console.log('🔄 App reset completed');
    }

    // Get app health status
    getHealthStatus() {
        const health = {
            status: 'healthy',
            issues: [],
            dependencies: {
                database: !!window.shoppingDB,
                voiceHandler: !!window.voiceHandler,
                aiSuggestions: !!window.aiSuggestions
            },
            storage: window.firebaseStatus || { storageType: 'Unknown' },
            itemsCount: this.items.length
        };

        // Check for issues
        if (!health.dependencies.database) {
            health.issues.push('Database not initialized');
            health.status = 'degraded';
        }

        if (!health.dependencies.voiceHandler) {
            health.issues.push('Voice recognition not available');
            health.status = 'degraded';
        }

        if (!health.dependencies.aiSuggestions) {
            health.issues.push('AI suggestions not available');
            health.status = 'degraded';
        }

        if (health.issues.length > 2) {
            health.status = 'unhealthy';
        }

        return health;
    }
}

// Initialize the app when DOM is loaded
let shoppingApp;

function initializeShoppingApp() {
    try {
        shoppingApp = new ShoppingApp();
        
        // Make it globally accessible
        window.shoppingApp = shoppingApp;
        
        // Add keyboard shortcuts info
        console.log('⌨️ Keyboard shortcuts:');
        console.log('  - Ctrl/Cmd + Space: Start voice recognition');
        
        // Add development helpers
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.shoppingAppHelpers = {
                addTestData: () => {
                    const testItems = [
                        { item: 'milk', quantity: 1, category: 'Dairy' },
                        { item: 'bread', quantity: 2, category: 'Bakery' },
                        { item: 'apples', quantity: 5, category: 'Produce' },
                        { item: 'chicken breast', quantity: 1, category: 'Meat' }
                    ];
                    
                    testItems.forEach(async (item) => {
                        await shoppingApp.addItem(item);
                    });
                    
                    console.log('🧪 Test data added');
                },
                clearTestData: () => shoppingApp.clearAllItems(),
                getStats: () => shoppingApp.exportStatistics(),
                getHealth: () => console.table(shoppingApp.getHealthStatus())
            };
            
            console.log('🔧 Development helpers available: window.shoppingAppHelpers');
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize Shopping App:', error);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeShoppingApp);
} else {
    // DOM is already ready
    initializeShoppingApp();
}

// Handle page visibility changes to refresh data when page becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && shoppingApp) {
        // Refresh suggestions when page becomes visible
        if (window.aiSuggestions) {
            window.aiSuggestions.refreshSuggestions();
        }
    }
});

// Handle beforeunload to save any pending changes
window.addEventListener('beforeunload', (e) => {
    if (shoppingApp && shoppingApp.isLoading) {
        e.preventDefault();
        e.returnValue = 'Changes are being saved. Are you sure you want to leave?';
        return e.returnValue;
    }
});

// Export for ES6 modules
export default ShoppingApp;