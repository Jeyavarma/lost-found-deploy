const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const auth = require('../middleware/auth/authMiddleware');

// =============================
// 🧭  PUBLIC AI SEARCH (no auth)
// =============================
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters long' });
    }

    console.log('🔍 AI Search query:', query);

    // Fetch all items for searching
    const allItems = await Item.find({})
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 });

    const queryText = query.toLowerCase();

    // Simple scoring logic
    const scoredItems = allItems.map(item => {
      let score = 0;
      const itemText = `${item.title} ${item.description} ${item.category} ${item.location}`.toLowerCase();

      // Exact match
      if (itemText.includes(queryText)) score += 50;

      // Word-by-word partial matches
      const queryWords = queryText.split(/\s+/).filter(w => w.length > 2);
      queryWords.forEach(word => {
        if (itemText.includes(word)) score += 10;
      });

      return {
        ...item.toObject(),
        searchScore: score
      };
    });

    // Sort by score
    const results = scoredItems
      .filter(item => item.searchScore > 0)
      .sort((a, b) => b.searchScore - a.searchScore)
      .slice(0, 20);

    console.log(`✅ AI Search found ${results.length} results`);

    res.json({
      query,
      results,
      total: results.length
    });

  } catch (error) {
    console.error('❌ AI Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});


// ====================================
// 🤖  AI-POWERED SIMILAR ITEM MATCHING
// ====================================
router.post('/similar-items', auth, async (req, res) => {
  try {
    const { query, category, location, status } = req.body;

    console.log('🤖 AI Search initiated:', { query, category, location, status });

    // Get opposite-status items (lost ↔ found)
    const targetStatus = status === 'lost' ? 'found' : 'lost';
    const allItems = await Item.find({
      status: targetStatus,
      reportedBy: { $ne: req.user.id }
    }).populate('reportedBy', 'name email');

    console.log(`📊 Found ${allItems.length} items to analyze`);

    const scoredItems = allItems.map(item => {
      let score = 0;
      const itemText = `${item.title} ${item.description}`.toLowerCase();
      const queryText = query.toLowerCase();

      // 1️⃣ Category match
      if (category && item.category && item.category.toLowerCase() === category.toLowerCase()) {
        score += 40;
      }

      // 2️⃣ Location proximity
      if (location && item.location) {
        const queryLoc = location.toLowerCase();
        const itemLoc = item.location.toLowerCase();
        if (queryLoc === itemLoc) score += 30;
        else if (queryLoc.includes(itemLoc) || itemLoc.includes(queryLoc)) score += 20;
      }

      // 3️⃣ Word-level text similarity
      const queryWords = queryText.split(/\s+/).filter(w => w.length > 2);
      const itemWords = itemText.split(/\s+/).filter(w => w.length > 2);
      let wordMatches = 0;

      queryWords.forEach(qWord => {
        if (itemWords.includes(qWord)) {
          wordMatches++;
          score += 5;
        }
      });

      // 4️⃣ Brand match
      const brands = ['apple', 'samsung', 'sony', 'nike', 'adidas', 'hp', 'dell', 'lenovo'];
      brands.forEach(brand => {
        if (queryText.includes(brand) && itemText.includes(brand)) score += 25;
      });

      // 5️⃣ Color match
      const colors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'brown', 'pink'];
      colors.forEach(color => {
        if (queryText.includes(color) && itemText.includes(color)) score += 20;
      });

      // 6️⃣ Recency bonus
      const daysDiff = Math.abs((new Date() - new Date(item.createdAt)) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 7) score += 10;
      else if (daysDiff <= 30) score += 5;

      const confidence = Math.min(95, Math.max(10, score + (wordMatches * 5)));

      return {
        ...item.toObject(),
        aiScore: Math.min(100, score),
        confidence,
        matchReason: generateMatchReason(score, wordMatches, category, location)
      };
    });

    // Filter top matches
    const relevantItems = scoredItems
      .filter(item => item.aiScore >= 15)
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, 10);

    console.log(`🎯 AI found ${relevantItems.length} relevant matches`);

    res.json({
      query,
      totalAnalyzed: allItems.length,
      matches: relevantItems,
      algorithm: 'Advanced ML-like Scoring',
      timestamp: new Date()
    });

  } catch (error) {
    console.error('🚨 AI Search error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ===========================
// 🧩 Helper Functions
// ===========================

// Optional string similarity (Levenshtein-based)
function calculateStringSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

function generateMatchReason(score, wordMatches, category, location) {
  const reasons = [];

  if (score >= 40) reasons.push('Strong category match');
  if (wordMatches >= 3) reasons.push('Multiple keyword matches');
  if (category) reasons.push('Category similarity');
  if (location) reasons.push('Location proximity');
  if (score >= 70) reasons.push('High confidence match');

  return reasons.length > 0 ? reasons.join(', ') : 'Basic similarity detected';
}

module.exports = router;