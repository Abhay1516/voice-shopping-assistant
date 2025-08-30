Voice Command Shopping Assistant 🛒🎤
A smart, voice-activated shopping list manager with AI-powered suggestions and natural language processing capabilities.

🌟 Features
Voice Recognition
Voice Commands: Add items using natural speech ("Add milk", "I need apples")
Natural Language Processing: Understands varied phrases and commands
Multilingual Support: Works with multiple languages
Quantity Recognition: "Add 2 bottles of water" or "I need 5 oranges"
Smart Suggestions
AI-Powered Recommendations: Based on shopping history and current list
Seasonal Suggestions: Items that are in season or commonly needed
Complementary Items: Suggests items that go together
Smart Substitutes: Alternative options for unavailable items
Shopping List Management
Add/Remove Items: Voice and manual input support
Auto-Categorization: Items sorted into categories (Dairy, Produce, etc.)
Quantity Management: Track how many of each item you need
Completion Tracking: Check off items as you shop
Advanced Features
Voice Search: Find items by speaking ("Find organic apples")
Price Range Filtering: Search within budget constraints
Real-time Updates: Live feedback on voice recognition
Data Persistence: Items saved locally and in cloud (Firebase)
🚀 Live Demo
Try the Live Demo

🛠 Technology Stack
Frontend: HTML5, CSS3, Vanilla JavaScript
Voice Recognition: Web Speech API
AI/NLP: OpenAI API (GPT-3.5)
Database: Firebase Firestore
Hosting: Firebase Hosting
UI Framework: Bootstrap 5
Icons: Font Awesome
📋 Requirements Met
✅ Voice Input: Complete voice command recognition
✅ NLP Processing: Natural language understanding
✅ Multilingual Support: Multiple language options
✅ Smart Suggestions: AI-powered recommendations
✅ Shopping List Management: Full CRUD operations
✅ Voice Search: Item search by voice
✅ Minimalist UI: Clean, mobile-friendly interface
✅ Cloud Hosting: Deployed on Firebase

🏗 Setup Instructions
Prerequisites
Node.js (v14 or higher)
Firebase account
OpenAI API account (optional, for enhanced suggestions)
1. Clone Repository
bash
git clone https://github.com/Abhay1516/voice-shopping-assistant.git
2. Install Dependencies
bash
npm install
3. Firebase Setup
Go to Firebase Console
Create new project: "voice-shopping-assistant"
Enable Firestore Database
Enable Firebase Hosting
Copy your config and update firebase-config.js
4. OpenAI Setup (Optional)
Get API key from OpenAI Platform
The app will prompt you to enter it when first loaded
5. Local Development
bash
npm start
# Opens localhost:3000
6. Deploy to Firebase
bash
npm run deploy
🎯 Usage
Voice Commands
Add Items: "Add milk", "I need bread", "Put apples on my list"
Remove Items: "Remove milk", "Delete bread from my list"
Quantities: "Add 2 bottles of water", "I need 5 bananas"
Search: "Find organic tomatoes", "Search for gluten-free bread"
Manual Input
Type item names in the input field
Click + button or press Enter to add
Use buttons to modify quantities
Smart Features
Check suggested items in the right panel
Click suggestions to add them instantly
View items organized by categories
Export your list as JSON
📱 Browser Support
Chrome ✅ (Recommended - best voice support)
Edge ✅ (Good voice support)
Safari ✅ (Limited voice features)
Firefox ⚠️ (No voice recognition)
🔧 Configuration
Firebase Config
Update firebase-config.js with your Firebase project settings:

javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    // ... other config
};
OpenAI API (Optional)
For enhanced AI suggestions, add your OpenAI API key when prompted, or set it programmatically:

javascript
window.aiSuggestions.setApiKey('your-openai-api-key');
📂 Project Structure
voice-shopping-assistant/
├── index.html              # Main HTML file
├── styles.css              # Styling and animations
├── script.js               # Main application logic
├── firebase-config.js      # Database configuration
├── voice-handler.js        # Voice recognition & NLP
├── ai-suggestions.js       # AI-powered suggestions
├── package.json           # Dependencies
├── README.md             # Documentation
└── .gitignore           # Git ignore rules
🔐 Privacy & Security
Voice processing happens in your browser (not sent to servers)
Firebase data is secured with your project rules
OpenAI API calls are made directly from your browser
No personal voice data is stored permanently
🐛 Troubleshooting
Voice Recognition Not Working
Ensure you're using Chrome, Edge, or Safari
Allow microphone permissions
Use HTTPS (required for voice features)
Items Not Saving
Check Firebase configuration
Verify internet connection
Look for console errors
AI Suggestions Not Loading
Verify OpenAI API key is set
Check API quota and billing
Fallback suggestions will still work
🎨 Customization
Adding New Categories
Edit the categorizeItem() function in voice-handler.js:

javascript
const categories = {
    'Custom Category': ['item1', 'item2', 'item3']
};
Voice Commands
Add new command patterns in parseCommand() method:

javascript
const patterns = {
    newAction: [/^(custom|pattern)\s+(.+)$/i]
};
📈 Performance
Load Time: < 2 seconds on average connection
Voice Response: Real-time recognition and processing
Offline Support: Basic functionality works offline
Mobile Optimized: Responsive design for all devices
🤝 Contributing
Fork the repository
Create feature branch: git checkout -b feature/amazing-feature
Commit changes: git commit -m 'Add amazing feature'
Push to branch: git push origin feature/amazing-feature
Open Pull Request
📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
Web Speech API for voice recognition
OpenAI for AI-powered suggestions
Firebase for backend services
Bootstrap for UI components
Font Awesome for icons
📞 Support
If you encounter any issues:

Check the Issues page
Create a new issue with details
Check browser console for error messages
Built with ❤️ for the Software Engineering Technical Assessment

Time Investment: 8 hours | Focus: Practical functionality with clean code

