const express = require('express');
const router = express.Router();
const handicapController = require('../controllers/handicapController');

// Define the route with a parameter for the member's ID
// Search route (must be before ID route to avoid collision)
router.get('/search', handicapController.searchGolfers);

// Define the route with a parameter for the member's ID
router.get('/:memberId', handicapController.getHandicap);

module.exports = router;
