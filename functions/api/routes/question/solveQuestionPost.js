const functions = require('firebase-functions');
const util = require('../../../lib/util');
const statusCode = require('../../../constants/statusCode');
const responseMessage = require('../../../constants/responseMessage');
const db = require('../../../db/db');
const jwtHandlers = require('../../../lib/jwtHandlers');
const dotenv = require('dotenv');
const { questionDB } = require('../../../db');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { evaluateWithGPT } = require('./gptEvaluator');
dotenv.config();

function runPythonCode(code) {
    return new Promise((resolve, reject) => {
        const tempFilePath = path.join(os.tmpdir(), `temp_python_code_${Date.now()}.py`);
        fs.writeFileSync(tempFilePath, code);

        if (!fs.existsSync(tempFilePath)) {
            return reject(new Error(`File not found: ${tempFilePath}`));
        }

        console.log(`Running Python code from file: ${tempFilePath}`);
        
        execFile('python3', [tempFilePath], (error, stdout, stderr) => {
            fs.unlinkSync(tempFilePath);

            if (error) {
                console.error('execFile error:', error);
                return reject(error);
            }
            if (stderr) {
                console.error('execFile stderr:', stderr);
                return reject(new Error(stderr));
            }

            console.log('execFile stdout:', stdout);
            resolve(stdout);
        });
    });
}

module.exports = async (req, res) => {
    const { accesstoken } = req.headers;
    const { solve } = req.body;
    let client;

    if (!accesstoken || !solve) {
        return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }

    let result;
    try {
        console.log('Executing Python code...');
        result = await runPythonCode(solve);
        console.log('Python code executed successfully:', result);
    } catch (err) {
        console.log('Error executing Python code:', err);
        return res.status(500).send({ error: err.message });
    }

    try {
        console.log('Connecting to the database...');
        client = await db.connect(req);

        const decodedToken = jwtHandlers.verify(accesstoken);
        const userId = decodedToken.email;
        if (!userId) {
            console.log('User not found in the token.');
            client.release();
            return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
        }

        console.log('Fetching question list from the database...');
        const questionList = await questionDB.getUserByQuestion(client, userId);

        console.log('User question list:', questionList);

        const latestQuestion = questionList[0];
        if (!latestQuestion) {
            console.log('No questions found for the user.');
            client.release();
            return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_QUESTION));
        }
        const questionId = latestQuestion.id;
        console.log('Latest question ID:', questionId);

        const saveSolve = await questionDB.solvequestion(client, questionId,userId, solve, result);

        const questionanswer = await questionDB.getQeustionByanswer(client, questionId);
        console.log('questionanswer:', questionanswer); // 디버깅을 위해 추가

        if (!questionanswer) {
            console.log('No answer found for the question.');
            client.release();
            return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_QUESTION));
        }

        const feedback = await evaluateWithGPT(questionanswer.questionText, questionanswer.result, result);

        
        const saveeqaul = await questionDB.savequalquestion(client,questionId,userId,feedback.tf,feedback.data);


        res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.CREATE_SUCCESS, saveeqaul));


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
