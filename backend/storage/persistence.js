const fs = require('fs');
const path = require('path');
const { chatRooms, messages } = require('./chatStorage');

const STORAGE_DIR = path.join(__dirname, 'data');
const ROOMS_FILE = path.join(STORAGE_DIR, 'rooms.json');
const MESSAGES_FILE = path.join(STORAGE_DIR, 'messages.json');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Save data to files
const saveData = () => {
  try {
    const roomsData = Object.fromEntries(chatRooms);
    const messagesData = Object.fromEntries(messages);
    
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(roomsData, null, 2));
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messagesData, null, 2));
    
    console.log('Chat data saved to disk');
  } catch (error) {
    console.error('Failed to save chat data:', error);
  }
};

// Load data from files
const loadData = () => {
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const roomsData = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
      Object.entries(roomsData).forEach(([key, value]) => {
        chatRooms.set(key, value);
      });
    }
    
    if (fs.existsSync(MESSAGES_FILE)) {
      const messagesData = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
      Object.entries(messagesData).forEach(([key, value]) => {
        messages.set(key, value);
      });
    }
    
    console.log('Chat data loaded from disk');
  } catch (error) {
    console.error('Failed to load chat data:', error);
  }
};

// Auto-save every 5 minutes
setInterval(saveData, 5 * 60 * 1000);

// Save on process exit
process.on('SIGINT', () => {
  saveData();
  process.exit(0);
});

process.on('SIGTERM', () => {
  saveData();
  process.exit(0);
});

module.exports = {
  saveData,
  loadData
};