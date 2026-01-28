const express = require('express');
const router = express.Router();
const Claim = require('../models/Claim');
const Item = require('../models/Item');
const User = require('../models/User');
const auth = require('../middleware/auth/authMiddleware');

// Submit a claim for a lost item
router.post('/submit', auth, async (req, res) => {
  try {
    const { itemId, ownershipProof, additionalInfo, verificationAnswers } = req.body;
    
    const item = await Item.findById(itemId).populate('reportedBy');
    if (!item || item.status !== 'lost') {
      return res.status(400).json({ error: 'Item not available for claiming' });
    }
    
    // Check if user already has pending claim
    const existingClaim = await Claim.findOne({ 
      itemId, 
      claimantId: req.user.id, 
      status: 'pending' 
    });
    if (existingClaim) {
      return res.status(400).json({ error: 'You already have a pending claim for this item' });
    }
    
    const claim = new Claim({
      itemId,
      claimantId: req.user.id,
      originalOwnerId: item.reportedBy._id,
      ownershipProof,
      additionalInfo,
      verificationQuestions: verificationAnswers || []
    });
    
    await claim.save();
    
    // Update item status
    item.status = 'claimed';
    await item.save();
    
    res.json({ message: 'Claim submitted successfully', claimId: claim._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get claims for current user (as owner)
router.get('/my-items', auth, async (req, res) => {
  try {
    const claims = await Claim.find({ originalOwnerId: req.user.id })
      .populate('itemId')
      .populate('claimantId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get claims submitted by current user
router.get('/my-claims', auth, async (req, res) => {
  try {
    const claims = await Claim.find({ claimantId: req.user.id })
      .populate('itemId')
      .populate('originalOwnerId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify claim (by original owner)
router.post('/verify/:claimId', auth, async (req, res) => {
  try {
    const { action, returnMethod, returnLocation, returnDate } = req.body;
    
    const claim = await Claim.findById(req.params.claimId)
      .populate('itemId')
      .populate('claimantId');
    
    if (!claim || claim.originalOwnerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    if (action === 'approve') {
      claim.status = 'verified';
      claim.returnMethod = returnMethod;
      claim.returnLocation = returnLocation;
      claim.returnDate = new Date(returnDate);
      claim.verificationDate = new Date();
      
      // Update item status
      const item = await Item.findById(claim.itemId);
      item.status = 'verified';
      await item.save();
    } else {
      claim.status = 'rejected';
      
      // Reset item status to lost
      const item = await Item.findById(claim.itemId);
      item.status = 'lost';
      await item.save();
    }
    
    await claim.save();
    
    res.json({ message: `Claim ${action}d successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark return as completed
router.post('/complete-return/:claimId', auth, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.claimId);
    
    if (!claim || (claim.originalOwnerId.toString() !== req.user.id && claim.claimantId.toString() !== req.user.id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    claim.returnCompleted = true;
    claim.status = 'completed';
    await claim.save();
    
    // Update item status to resolved
    const item = await Item.findById(claim.itemId);
    item.status = 'resolved';
    await item.save();
    
    res.json({ message: 'Return completed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all pending claims
router.get('/admin/pending', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const claims = await Claim.find({ status: 'pending' })
      .populate('itemId')
      .populate('claimantId', 'name email')
      .populate('originalOwnerId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;