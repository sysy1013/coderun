const express = require('express');
//const { checkUser } = require('../../../middlewares/auth');
const router = express.Router();

router.post('/signup', require('./authSignupPOST'));
router.post('/login/email', require('./authLoginEmailPOST'));
router.post('/pwChange', require('./authPwChangePUT'));

module.exports = router;