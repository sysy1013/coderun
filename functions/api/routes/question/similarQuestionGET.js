const { spawn } = require('child_process');
const functions = require('firebase-functions');
const util = require('../../../lib/util');
const statusCode = require('../../../constants/statusCode');
const responseMessage = require('../../../constants/responseMessage');
const db = require('../../../db/db');
const jwtHandlers = require('../../../lib/jwtHandlers');
const { questionDB } = require('../../../db');
const dotenv = require('dotenv');
dotenv.config();

function recommendProblems(userProblemText, topicProblems) {
    return new Promise((resolve, reject) => {
        const pyProg = spawn('python3', ['/Users/sonsihyeong/desktop/jejuuiv/coderun/functions/api/routes/question/recommend_problems.py', userProblemText, JSON.stringify(topicProblems)]);

        let data = '';
        pyProg.stdout.on('data', (chunk) => {
            data += chunk.toString();
        });

        pyProg.stderr.on('data', (err) => {
            console.error('Error:', err.toString());
            reject(err.toString());
        });

        pyProg.stdout.on('end', () => {
            resolve(JSON.parse(data));
        });
    });
}

module.exports = async (req, res) => {
    const { accesstoken,problemid } = req.headers;

    if (!problemid || !accesstoken) {
        return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }

    let client;

    try {
        client = await db.connect(req);
        const decodedToken = jwtHandlers.verify(accesstoken);
        const userId = decodedToken.email;

        if (!userId) {
            return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
        }

        // 문제 ID를 통해 문제 텍스트와 주제를 가져오기
        const getTopicAndQuestion = await questionDB.getUserByQuestionAndTopic(client, problemid);
        const topic = getTopicAndQuestion.topic;
        const questionText = getTopicAndQuestion.question_text;

        // 특정 주제의 문제들을 가져오기
        const topicProblems = await questionDB.getProblemsByTopic(client, topic);

        // 유사한 문제를 추천
        const recommendedProblem = await recommendProblems(questionText, topicProblems);

        res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ALL_USERS_SUCCESS, { recommendedProblem }));

    } catch (error) {
        functions.logger.error(`[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`, `[CONTENT] ${error}`);
        console.error(error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));

    } finally {
        if (client) {
            client.release();
        }
    }
};
