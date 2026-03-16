const Item = require('../models/Item');
const { setCache } = require('../config/redis-replacement');
const { isConfigured } = require('../utils/openai');
const visualAIService = require('../services/visualAI');

class MatchingService {
  static async computeMatches(userId) {
    try {
      const userItems = await Item.find({ reportedBy: userId }).lean();
      if (userItems.length === 0) return [];

      let allMatches = [];

      // OPTIMIZATION: Fetch potential candidates ONCE for all user items
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const allRecentCandidates = await Item.find({
        reportedBy: { $ne: userId },
        createdAt: { $gte: thirtyDaysAgo }
      }).lean();

      for (const userItem of userItems) {
        const oppositeStatus = userItem.status === 'lost' ? 'found' : 'lost';

        // -------------------------------------------------------------
        // LEVEL 2: OpenAI Vector Search (Best Quality)
        // -------------------------------------------------------------
        if (isConfigured() && userItem.embedding && userItem.embedding.length === 1536) {
          try {
            const vectorMatches = await Item.aggregate([
              {
                $vectorSearch: {
                  index: 'item_embedding_index',
                  path: 'embedding',
                  queryVector: userItem.embedding,
                  numCandidates: 100,
                  limit: 10
                }
              },
              {
                $match: {
                  status: oppositeStatus,
                  reportedBy: { $ne: userId }
                }
              },
              {
                $addFields: {
                  matchScore: { $multiply: [{ $meta: 'vectorSearchScore' }, 100] },
                  matchMethod: 'AI Vector Search'
                }
              },
              {
                $match: { matchScore: { $gte: 65 } } // Minimum similarity threshold
              }
            ]);

            if (vectorMatches.length > 0) {
              const matchesWithUserItem = vectorMatches.map(m => ({ ...m, matchedUserItem: userItem }));
              allMatches.push(...matchesWithUserItem);
              continue; // Skip level 1 and 3 if vector search found results
            }
          } catch (vectorError) {
            console.error('⚠️ Vector search failed (falling back to Level 1):', vectorError.message);
            // This usually happens if the Atlas index 'item_embedding_index' hasn't been created yet
          }
        }

        // -------------------------------------------------------------
        // LEVEL 1: MongoDB Full-Text Search (Fast Fallback)
        // -------------------------------------------------------------
        let usedAdvancedMatch = false;

        try {
          const searchText = `${userItem.title} ${userItem.description} ${userItem.category} ${userItem.location}`;
          const textMatches = await Item.aggregate([
            {
              $match: {
                $text: { $search: searchText },
                status: oppositeStatus,
                reportedBy: { $ne: userId }
              }
            },
            {
              $addFields: {
                matchScore: { $multiply: [{ $meta: 'textScore' }, 10] }, // Normalize score somewhat
                matchMethod: 'Text Search (Level 1)'
              }
            },
            {
              $sort: { matchScore: -1 }
            },
            { $limit: 10 }
          ]);

          if (textMatches.length > 0) {
            const matchesWithUserItem = textMatches.map(m => ({ ...m, matchedUserItem: userItem }));
            allMatches.push(...matchesWithUserItem);
            usedAdvancedMatch = true;
          }
        } catch (textError) {
          console.error('⚠️ Text search failed (falling back to Level 3):', textError.message);
        }

        if (usedAdvancedMatch) continue; // Skip level 3 if text search found results

        // -------------------------------------------------------------
        // LEVEL 2.5: CLIP Image Embeddings Match (Local)
        // -------------------------------------------------------------
        let foundImageMatch = false;
        if (userItem.imageFeatures && userItem.imageFeatures.length > 0) {
          try {
            const imageCandidates = allRecentCandidates.filter(item =>
              item.status === oppositeStatus &&
              item.imageFeatures &&
              item.imageFeatures.length > 0
            );

            for (const item of imageCandidates) {
              if (item.imageFeatures && item.imageFeatures.length > 0) {
                const similarity = visualAIService.cosineSimilarity(userItem.imageFeatures, item.imageFeatures);
                // CLIP similarity >= 0.82 is typically a good match threshold
                if (similarity >= 0.82) {
                  const normalizedScore = Math.min((similarity - 0.70) * (100 / 0.30), 100);
                  allMatches.push({ ...item, matchScore: normalizedScore, matchMethod: 'Visual AI (CLIP)', matchedUserItem: userItem });
                  foundImageMatch = true;
                }
              }
            }
          } catch (clipError) {
            console.error('⚠️ CLIP Image Match failed:', clipError.message);
          }
        }

        if (foundImageMatch) continue; // Skip heuristic if we got high-confidence image matches

        // -------------------------------------------------------------
        // LEVEL 3: Classic Heuristic (Final Fallback)
        // -------------------------------------------------------------
        const heuristicCandidates = allRecentCandidates.filter(item => item.status === oppositeStatus);

        heuristicCandidates.forEach(item => {
          const score = this.calculateMatchScore(userItem, item);
          if (score >= 15) {
            allMatches.push({ ...item, matchScore: Math.min(score, 100), matchMethod: 'Heuristic', matchedUserItem: userItem });
          }
        });
      }

      // Deduplicate matches, keeping the highest score for any given item
      const uniqueMatches = allMatches.reduce((acc, current) => {
        const idStr = current._id.toString();
        const existing = acc.find(item => item._id.toString() === idStr);
        if (!existing || current.matchScore > existing.matchScore) {
          return acc.filter(item => item._id.toString() !== idStr).concat(current);
        }
        return acc;
      }, []);

      const sortedMatches = uniqueMatches
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 10);

      // Populate reportedBy names manually since we used aggregate
      await Item.populate(sortedMatches, { path: 'reportedBy', select: 'name' });

      // Cache for 10 minutes
      await setCache(`matches:${userId}`, sortedMatches, 600);
      return sortedMatches;
    } catch (error) {
      console.error('❌ Error computing matches:', error);
      return [];
    }
  }

  static calculateMatchScore(userItem, item) {
    let score = 0;
    const userText = `${userItem.title} ${userItem.description || ''}`.toLowerCase();
    const itemText = `${item.title} ${item.description || ''}`.toLowerCase();

    // Category match (40 points)
    if (userItem.category && item.category &&
      userItem.category.toLowerCase() === item.category.toLowerCase()) {
      score += 40;
    }

    // Location match (30 points)
    if (userItem.location && item.location) {
      const userLoc = userItem.location.toLowerCase();
      const itemLoc = item.location.toLowerCase();
      if (userLoc.includes(itemLoc) || itemLoc.includes(userLoc)) {
        score += 30;
      }
    }

    // Keywords match
    const keywords = ['red', 'blue', 'black', 'white', 'apple', 'samsung', 'phone', 'wallet', 'keys'];
    keywords.forEach(keyword => {
      if (userText.includes(keyword) && itemText.includes(keyword)) {
        score += 15;
      }
    });

    return score;
  }

  static async scheduleMatchUpdates() {
    setInterval(async () => {
      try {
        const users = await Item.distinct('reportedBy');
        // Since API calls now happen during computeMatches (if generating missing embeddings), 
        // we process these sequentially to avoid rate limits
        for (const userId of users) {
          await this.computeMatches(userId);
        }
        console.log('✅ Matches updated for all users');
      } catch (error) {
        console.error('Error updating matches:', error);
      }
    }, 10 * 60 * 1000); // Every 10 minutes
  }
}

module.exports = MatchingService;