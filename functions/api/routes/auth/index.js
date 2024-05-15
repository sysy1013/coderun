const express = require('express');
//const { checkUser } = require('../../../middlewares/auth');
const router = express.Router();

router.post('/signup', require('./authSignupPOST'));
router.post('/login/email', require('./authLoginEmailPOST'));

//사용불가 2순위
router.post('/pwChange', require('./authPwChangePUT')); 


module.exports = router;