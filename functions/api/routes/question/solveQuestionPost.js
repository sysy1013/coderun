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

function runPythonCode(code) {
    return new Promise((resolve, reject) => {
        const options = {
            mode: 'text',
            pythonOptions: ['-u']
        };

        PythonShell.runString(code, options, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results ? results.join('\n') : '');
        });
    });
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
        // 사용자로부터 받은 코드를 PythonShell을 통해 실행
        console.log('Executing Python code...');
        let result;
        try {
            result = await runPythonCode(solve);
            console.log('Python code executed successfully:', result);
        } catch (err) {
            console.log('Error executing Python code:', err);
            if (client) {
                client.release();  // 오류 발생 시 클라이언트 릴리스
            }
            return res.status(500).send({ error: err.message });
        }

        console.log('Connecting to the database...');
        client = await db.connect(req);

        const decodedToken = jwtHandlers.verify(accesstoken);
        const userId = decodedToken.email;
        if (!userId) {
            console.log('User not found in the token.');
            client.release();
            return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
        }

        // 해당 사용자의 질문 리스트 가져오기
        console.log('Fetching question list from the database...');
        const questionList = await questionDB.getUserByQuestion(client, userId);

        // 여기서 문제 DB찾아서 집어 넣을 때 문제의 ID를 찾기보단 created_at을 기준으로 가장 최근에 만들어진게 해당 sol이기 때문에 가장 최근 것의 id를 해당 DB에다가 넣어서 찾자
        console.log('User question list:', questionList);

        const latestQuestion = questionList[0];
        if (!latestQuestion) {
            console.log('No questions found for the user.');
            client.release();
            return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_QUESTION));
        }
        const questionId = latestQuestion.id;
        console.log(questionId);

        // 제출된 솔루션을 데이터베이스에 저장
        const saveSolve = await questionDB.solvequestion(client, userId, questionId, solve, result);

        // 결과를 반환합니다.
        res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.CREATE_SUCCESS, saveSolve));

    } catch (error) {
        functions.logger.error(`[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`, `[CONTENT] ${error}`);
        console.log(error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));

    } finally {
        if (client) {
            client.release();
        }
    }
};
