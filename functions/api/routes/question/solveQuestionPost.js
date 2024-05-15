const functions = require('firebase-functions');
const util = require('../../../lib/util');
const statusCode = require('../../../constants/statusCode');
const responseMessage = require('../../../constants/responseMessage');
const db = require('../../../db/db');
const jwtHandlers = require('../../../lib/jwtHandlers');
const dotenv = require('dotenv');
const { questionDB } = require('../../../db');
const { PythonShell } = require('python-shell');

dotenv.config();

async function processDatabaseAndRespond(client, userId, solve, result, res) {
    try {
        console.log('Processing database response...');
        const questionList = await questionDB.getUserByQuestion(client, userId);

        const latestQuestion = questionList[0];
        if (!latestQuestion) {
            console.log('No questions found for the user.');
            client.release();  // 클라이언트 릴리스
            return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_QUESTION));
        }
        const questionId = latestQuestion.id;

        // 제출된 솔루션을 데이터베이스에 저장
        const saveSolve = await questionDB.solvequestion(client, userId, questionId, solve, result);

        // 결과를 반환합니다.
        console.log('Solution saved successfully.');
        client.release();  // 클라이언트 릴리스
        res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.CREATE_SUCCESS, saveSolve));
    } catch (error) {
        console.log('Error processing database response:', error);
        client.release();  // 클라이언트 릴리스
        functions.logger.error(`[ERROR] [${res.req.method.toUpperCase()}] ${res.req.originalUrl}`, `[CONTENT] ${error}`);
        res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
    }
}

module.exports = async (req, res) => {
    const { accesstoken } = req.headers;
    const { solve } = req.body;
    let client;

    // 필요한 값이 없을 때 보내주는 response
    if (!accesstoken || !solve) {
        return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }

    try {
        console.log('Connecting to the database...');
        client = await db.connect(req);
        const decodedToken = jwtHandlers.verify(accesstoken);
        const userId = decodedToken.email;
        if (!userId) {
            console.log('User not found in the token.');
            client.release();  // 클라이언트 릴리스
            return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
        }

        console.log('Executing Python code...');
        // 사용자로부터 받은 코드를 PythonShell을 통해 실행
        const options = {
            mode: 'text',
            pythonOptions: ['-u'], // '-u' 옵션은 stdio를 unbuffered 모드로 실행
            scriptPath: '', // 필요한 경우 Python 스크립트 경로 지정
            args: [solve]
        };

        // Python 코드 실행
        PythonShell.runString(solve, options, function (err, results) {
            if (err) {
                console.log('Error executing Python code:', err);
                client.release();  // 오류 발생 시 클라이언트 릴리스
                return res.status(500).send({ error: err.message });
            }
            console.log('Python code executed successfully:', results);
            const result = results.join('\n');
            processDatabaseAndRespond(client, userId, solve, result, res);
        });

    } catch (error) {
        console.log('Error in main try block:', error);
        if (client) {
            client.release();
        }
        functions.logger.error(`[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`, `[CONTENT] ${error}`);
        res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
    }
};
