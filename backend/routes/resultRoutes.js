const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');

router.get('/courses/:courseId/user/:userId/hasil', resultController.getUserExamResult);

module.exports = router;
