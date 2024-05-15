const express = require('express');
//const { checkUser } = require('../../../middlewares/auth');
const router = express.Router();

router.post('/newquestion', require('./newQuestionPOST'));
router.post('/solvequestion', require('./solveQuestionPost'));

module.exports = router;