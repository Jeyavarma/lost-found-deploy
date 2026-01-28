const Item = require('../models/Item');
const { setCache } = require('../config/redis');

class MatchingService {
  static async computeMatches(userId) {
    try {
      const userItems = await Item.find({ reportedBy: userId }).lean();
      if (userItems.length === 0) return [];

      const recentItems = await Item.find({
        reportedBy: { $ne: userId },
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
        $or: [{ status: 'found' }, { status: 'lost' }]
      }).populate('reportedBy', 'name').lean();

      const matches = [];

      userItems.forEach(userItem => {
        const oppositeStatus = userItem.status === 'lost' ? 'found' : 'lost';
        
        recentItems.forEach(item => {
          if (item.status === oppositeStatus) {
            const score = this.calculateMatchScore(userItem, item);
            if (score >= 15) {
              matches.push({ ...item, matchScore: Math.min(score, 100) });
            }
          }
        });
      });

      const uniqueMatches = matches.reduce((acc, current) => {
        const existing = acc.find(item => item._id.toString() === current._id.toString());
        if (!existing || current.matchScore > existing.matchScore) {
          return acc.filter(item => item._id.toString() !== current._id.toString()).concat(current);
        }
        return acc;
      }, []);

      const sortedMatches = uniqueMatches
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 6);

      // Cache for 10 minutes
      await setCache(`matches:${userId}`, sortedMatches, 600);
      return sortedMatches;
    } catch (error) {
      console.error('Error computing matches:', error);
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