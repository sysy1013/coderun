const express = require('express');
//const { checkUser } = require('../../../middlewares/auth');
const router = express.Router();

router.get('/list', require('./userListGET'));
router.delete('/userRemove', require('./userremmoveDelete'));
router.get('/questionlist',require("./userquestListGET"));
router.get('/mypagequestionlist',require('./mypageuserQuestionListGET'));
router.get('/repeatquestion',require('./repeatQuestionGET'));
module.exports = router;