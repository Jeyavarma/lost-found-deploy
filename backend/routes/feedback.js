const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// POST /api/feedback - Submit new feedback
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      feedbackType,
      rating,
      subject,
      message,
      department,
      year
    } = req.body;

    // Validate required fields
    if (!name || !email || !feedbackType || !rating || !subject || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, email, feedbackType, rating, subject, message' 
      });
    }

    // Create new feedback
    const feedback = new Feedback({
      name,
      email,
      feedbackType,
      rating: parseInt(rating),
      subject,
      message,
      department,
      year
    });

    await feedback.save();

    console.log('✅ New feedback submitted:', {
      id: feedback._id,
      type: feedbackType,
      rating: rating,
      from: email
    });

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedbackId: feedback._id
    });

  } catch (error) {
    console.error('❌ Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// GET /api/feedback - Get all feedback (for admin)
router.get('/', async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(feedback);
  } catch (error) {
    console.error('❌ Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// GET /api/feedback/stats - Get feedback statistics
router.get('/stats', async (req, res) => {
  try {
    const totalFeedback = await Feedback.countDocuments();
    const pendingFeedback = await Feedback.countDocuments({ status: 'pending' });
    const averageRating = await Feedback.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);

    const feedbackByType = await Feedback.aggregate([
      { $group: { _id: '$feedbackType', count: { $sum: 1 } } }
    ]);

    res.json({
      total: totalFeedback,
      pending: pendingFeedback,
      averageRating: averageRating[0]?.avgRating || 0,
      byType: feedbackByType
    });
  } catch (error) {
    console.error('❌ Error fetching feedback stats:', error);
    res.status(500).json({ error: 'Failed to fetch feedback statistics' });
  }
});

module.exports = router;