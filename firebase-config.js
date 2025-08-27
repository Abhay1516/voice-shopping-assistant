// Firebase Configuration and Database Setup
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    updateDoc,
    orderBy,
    query,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Firebase Configuration
// IMPORTANT: Replace with your Firebase config from Firebase Console
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase
let app, db;
let isFirebaseEnabled = false;

try {
    // Check if config is properly set
    if (firebaseConfig.apiKey !== "your-api-key-here") {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        isFirebaseEnabled = true;
        console.log('✅ Firebase initialized successfully');
    } else {
        console.log('⚠️ Firebase config not set - using local storage');
    }
} catch (error) {
    console.log('⚠️ Firebase initialization failed - using local storage:', error);
    isFirebaseEnabled = false;
}

// Database Operations Class
class ShoppingDatabase {
    constructor() {
        this.collectionName = 'shopping_items';
        this.localStorageKey = 'voice_shopping_list';
    }

    // Add item to database
    async addItem(itemData) {
        try {
            if (isFirebaseEnabled) {
                const docRef = await addDoc(collection(db, this.collectionName), {
                    ...itemData,
                    createdAt: serverTimestamp(),
                    completed: false
                });
                return { id: docRef.id, ...itemData };
            } else {
                // Fallback to localStorage
                const items = this.getLocalItems();
                const newItem = {
                    id: Date.now().toString(),
                    ...itemData,
                    createdAt: new Date().toISOString(),
                    completed: false
                };
                items.push(newItem);
                localStorage.setItem(this.localStorageKey, JSON.stringify(items));
                return newItem;
            }
        } catch (error) {
            console.error('Error adding item:', error);
            throw error;
        }
    }

    // Get all items from database
    async getItems() {
        try {
            if (isFirebaseEnabled) {
                const q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const items = [];
                querySnapshot.forEach((doc) => {
                    items.push({ id: doc.id, ...doc.data() });
                });
                return items;
            } else {
                // Fallback to localStorage
                return this.getLocalItems();
            }
        } catch (error) {
            console.error('Error getting items:', error);
            return this.getLocalItems(); // Fallback to local storage
        }
    }

    // Update item in database
    async updateItem(itemId, updateData) {
        try {
            if (isFirebaseEnabled) {
                const itemRef = doc(db, this.collectionName, itemId);
                await updateDoc(itemRef, {
                    ...updateData,
                    updatedAt: serverTimestamp()
                });
                return true;
            } else {
                // Fallback to localStorage
                const items = this.getLocalItems();
                const itemIndex = items.findIndex(item => item.id === itemId);
                if (itemIndex !== -1) {
                    items[itemIndex] = { ...items[itemIndex], ...updateData, updatedAt: new Date().toISOString() };
                    localStorage.setItem(this.localStorageKey, JSON.stringify(items));
                    return true;
                }
                return false;
            }
        } catch (error) {
            console.error('Error updating item:', error);
            return false;
        }
    }

    // Delete item from database
    async deleteItem(itemId) {
        try {
            if (isFirebaseEnabled) {
                await deleteDoc(doc(db, this.collectionName, itemId));
                return true;
            } else {
                // Fallback to localStorage
                const items = this.getLocalItems();
                const filteredItems = items.filter(item => item.id !== itemId);
                localStorage.setItem(this.localStorageKey, JSON.stringify(filteredItems));
                return true;
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            return false;
        }
    }

    // Clear all items
    async clearAllItems() {
        try {
            if (isFirebaseEnabled) {
                const querySnapshot = await getDocs(collection(db, this.collectionName));
                const deletePromises = [];
                querySnapshot.forEach((document) => {
                    deletePromises.push(deleteDoc(doc(db, this.collectionName, document.id)));
                });
                await Promise.all(deletePromises);
                return true;
            } else {
                // Fallback to localStorage
                localStorage.removeItem(this.localStorageKey);
                return true;
            }
        } catch (error) {
            console.error('Error clearing items:', error);
            return false;
        }
    }

    // Local storage helper methods
    getLocalItems() {
        try {
            const items = localStorage.getItem(this.localStorageKey);
            return items ? JSON.parse(items) : [];
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return [];
        }
    }

    // Get database status
    getStatus() {
        return {
            isFirebaseEnabled,
            storageType: isFirebaseEnabled ? 'Firebase Firestore' : 'Local Storage'
        };
    }
}

// Create and export database instance
const shoppingDB = new ShoppingDatabase();

// Export for use in other modules
window.shoppingDB = shoppingDB;
window.firebaseStatus = { isFirebaseEnabled, storageType: isFirebaseEnabled ? 'Firebase' : 'Local' };

export { shoppingDB, isFirebaseEnabled };