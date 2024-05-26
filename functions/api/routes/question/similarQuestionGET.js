const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const functions = require('firebase-functions');
const util = require('../../../lib/util');
const statusCode = require('../../../constants/statusCode');
const responseMessage = require('../../../constants/responseMessage');
const db = require('../../../db/db');
const jwtHandlers = require('../../../lib/jwtHandlers');
const { questionDB } = require('../../../db');
const dotenv = require('dotenv');
dotenv.config();
const OpenAI = require('openai');
const { newquestion } = require('../../../db/question');

async function callChatGPT(topic) {
    const openai = new OpenAI({
        apiKey: process.env['OPENAI_API_KEY'],
    });

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{
                role: 'user',
                content: `1. 문제 주제 선택: '${topic}'를 주제로 유사한 서로 다른 python 문제 10개를 생성. 이는 중학교 정보 수업과 관련된 문제를 생성.
                2. 문제 및 해답 제작: 문제는 중학생이 이해하고 풀 수 있도록 명확하고 직관적으로 작성.
                3. JSON 형식 제공: 문제와 해답을 다음 JSON 형식으로 제공:
                   {
                       "similarproblem": "문제 내용",
                       "solution": "해답 내용",
                       "result": "명확하게 떨어지는 결과값만 출력"
                   }`,
            }],
        });

        let generatedContent = response.choices[0].message.content;
        console.log("OpenAI API Response:", generatedContent); // 응답 내용 로그 추가

        // JSON 부분 추출 로직 개선
        const jsonObjectStrings = generatedContent.match(/{[\s\S]*?}(?=\n|$)/g);
        if (!jsonObjectStrings) {
            console.error('JSON part not found in the response');
            console.log("Full Response:", generatedContent); // 응답 내용 전체를 로그에 기록
            throw new Error('JSON part not found in the response');
        }

        const jsonArrayString = `[${jsonObjectStrings.join(",")}]`;
        let jsonObjects;
        try {
            jsonObjects = JSON.parse(jsonArrayString);
        } catch (parseError) {
            console.error('Error parsing JSON response:', parseError);
            console.error('Received content:', jsonArrayString);
            throw new Error('Invalid JSON response from OpenAI API');
        }

        return jsonObjects;
    } catch (error) {
        console.error('Error calling the GPT API:', error);
        throw error;
    }
}


function recommendProblems(userProblemText, jsonFilePath) {
    return new Promise((resolve, reject) => {
        const pyProg = spawn('python3', [path.resolve(__dirname, 'recommend_problems.py'), userProblemText, jsonFilePath]);

        let data = '';
        pyProg.stdout.on('data', (chunk) => {
            data += chunk.toString();
        });

        pyProg.stderr.on('data', (err) => {
            console.error('Error:', err.toString());
            reject(err.toString());
        });

        pyProg.stdout.on('end', () => {
            try {
                resolve(JSON.parse(data));
            } catch (err) {
                console.error('Error parsing Python script output:', err);
                console.error('Received output:', data);
                reject(err);
            }
        });
    });
}

module.exports = async (req, res) => {
    const { accesstoken, problemid } = req.headers;

    if (!problemid || !accesstoken) {
        return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }

    let client;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'json-'));
    const jsonFilePath = path.join(tempDir, 'topic_problems.json');

    try {
        client = await db.connect(req);
        const decodedToken = jwtHandlers.verify(accesstoken);
        const userId = decodedToken.email;

        if (!userId) {
            return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
        }

        const getTopicAndQuestionPromise = questionDB.getUserByQuestionAndTopic(client, problemid);

        const callChatGPTPromise = getTopicAndQuestionPromise.then(({ topic }) => callChatGPT(topic));

        const [getTopicAndQuestion, topicProblems] = await Promise.all([getTopicAndQuestionPromise, callChatGPTPromise]);

        const questionText = getTopicAndQuestion.question_text;

        fs.writeFileSync(jsonFilePath, JSON.stringify(topicProblems), 'utf8');

        const recommendedProblem = await recommendProblems(questionText, jsonFilePath);

        const Searchtopic = await questionDB.getTopic(client,problemid)

        const saverecommendProblem = await questionDB.newquestion(client,userId,recommendedProblem.recommended_problem_text,recommendedProblem.recommended_problem_solution,recommendedProblem.recommded_problem_result,Searchtopic.topic)
        

        res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ALL_USERS_SUCCESS, { recommendedProblem }));

    } catch (error) {
        functions.logger.error(`[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`, `[CONTENT] ${error}`);
        console.error(error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
    } finally {
        if (client) {
            client.release();
        }

        if (fs.existsSync(jsonFilePath)) {
            fs.unlinkSync(jsonFilePath);
        }
        if (fs.existsSync(tempDir)) {
            fs.rmdirSync(tempDir);
        }
    }
};
