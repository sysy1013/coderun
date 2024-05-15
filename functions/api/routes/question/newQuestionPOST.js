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

// GPT API 호출을 위한 함수
async function callChatGPT(topic) {
    const openai = new OpenAI({
        apiKey: process.env['OPENAI_API_KEY'],
      });
      
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [{
                role: 'user',
                content: `1. 문제 주제 선정: ${topic}를 바탕으로 문제를 생성합니다. 이 주제는 중학교 정보 수업과 관련이 있어야 합니다.
                2. 문제 및 해답 제작: 생성된 문제는 중학생이 이해하고 풀 수 있어야 합니다. 문제는 명확하고 직관적인 질문으로 구성되어야 하며, 해답은 정확하고 이해하기 쉬운 형식으로 제공해야 합니다.
                3. JSON 형식 제공: 문제와 해답을 다음 형식의 JSON으로 제공하십시오:
                   {
                       'problem': '여기에 문제 내용을 삽입하세요',
                       'solution': '여기에 해답 내용을 삽입하세요',
                       'result' : '결과값만 출력',
                   }`
            }]
        });

        // API에서 반환된 문제와 해답을 JSON 형식으로 변환하여 반환
        const generatedContent = response.choices[0].message;
        const contentObject = JSON.parse(generatedContent.content);
        console.log(contentObject); // 파싱된 객체 확인
        return contentObject;

        
    } catch (error) {
        console.error('Error calling the GPT API:', error);
        throw error;
    }
}
// Express 라우터 핸들러
module.exports = async (req, res) => {
    const { accesstoken } = req.headers;
    const { topic } = req.body;
    let client;

    console.log(accesstoken);

    if (!accesstoken) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));

    if (!topic) {
        return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }

    try {
        client = await db.connect();
        const decodedToken = jwtHandlers.verify(accesstoken);
        const userId = decodedToken.email;
        console.log(userId);
        if (!userId) {
            return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
        }
        
        // GPT API로 문제 생성
        const generatedContent = await callChatGPT(topic);
        if (generatedContent) {
            console.log("Problem:", generatedContent.problem); // 문제 출력
            console.log("Solution:", generatedContent.solution); // 해결책 출력
            console.log("Result:", generatedContent.result); // 결과 설명 출력
            // 다른 작업 수행 ...
        }


        // 문제를 데이터베이스에 저장
        const savedQuestion = await questionDB.newquestion(client, userId, generatedContent.problem, generatedContent.solution,generatedContent.result);

        // 저장된 데이터와 성공 메시지 전송
        res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.CREATE_SUCCESS, savedQuestion));

    } catch (error) {
        functions.logger.error(`[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`, `[CONTENT] ${error}`);
        res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
    } finally {
        if (client) {
            client.release();
        }
    }
};
