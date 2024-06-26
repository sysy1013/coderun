const functions = require('firebase-functions');
const util = require('../../../lib/util');
const statusCode = require('../../../constants/statusCode');
const responseMessage = require('../../../constants/responseMessage');
const db = require('../../../db/db');
const jwtHandlers = require('../../../lib/jwtHandlers');
const dotenv = require('dotenv');
const { userDB, questionDB } = require('../../../db');

module.exports = async (req, res) => {
  const { accesstoken } = req.headers; // headers 수정

  // 필요한 값이 없을 때 보내주는 response
  if (!accesstoken) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));

  let client;

  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    const userId = decodedToken.email;
    if (!userId) {
      console.log('User not found in the token.');
      client.release();
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
    }

    const questionCountByTopic = await questionDB.getQuestionCountByTopic(client, userId);

    // 결과를 객체 형태로 조립
    const formattedResult = questionCountByTopic.reduce((acc, curr, index) => {
      acc[`topic${index + 1}`] = curr.topic;
      acc[`count${index + 1}`] = curr.count;
      return acc;
    }, {});

    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ALL_USERS_SUCCESS, [formattedResult]));

  } catch (error) {
    functions.logger.error(`[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`, `[CONTENT] ${error}`);
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    if (client) client.release();
  }
};
