const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ClaudeService = require('../services/ClaudeService');

// Memory store for flashcard Leitner repetition progress
const studentFlashcardProgress = {};

// POST /api/ai/flashcards - Generate Flashcards & MindMap
router.post('/flashcards', auth, async (req, res) => {
  try {
    const { subject, topic } = req.body;
    const aiData = await ClaudeService.generateAIFlashcards({
      subject: subject || 'math',
      topic: topic || 'Dérivation'
    });

    res.json({
      success: true,
      data: aiData
    });
  } catch (error) {
    console.error('Flashcard generation error:', error);
    res.status(500).json({ error: 'Erreur lors de la génération des Flashcards IA.' });
  }
});

// POST /api/ai/flashcards/progress - Save Leitner box self-rating
router.post('/flashcards/progress', auth, async (req, res) => {
  try {
    const { flashcardId, rating } = req.body; // rating: 'easy', 'medium', 'hard'
    const studentId = req.user.id;

    if (!studentFlashcardProgress[studentId]) {
      studentFlashcardProgress[studentId] = {};
    }

    studentFlashcardProgress[studentId][flashcardId] = {
      rating,
      lastReviewed: new Date().toISOString()
    };

    const userProgress = studentFlashcardProgress[studentId];
    const totalRated = Object.keys(userProgress).length;
    const easyCount = Object.values(userProgress).filter(p => p.rating === 'easy').length;
    const masteryPct = totalRated > 0 ? Math.round((easyCount / totalRated) * 100) : 0;

    res.json({
      success: true,
      masteryPct,
      userProgress
    });
  } catch (error) {
    console.error('Flashcard progress error:', error);
    res.status(500).json({ error: 'Erreur d\'enregistrement de la progression.' });
  }
});

module.exports = router;
