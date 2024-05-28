const functions = require('firebase-functions');
const util = require('../../../lib/util');
const statusCode = require('../../../constants/statusCode');
const responseMessage = require('../../../constants/responseMessage');
const db = require('../../../db/db');
const jwtHandlers = require('../../../lib/jwtHandlers');
const dotenv = require('dotenv');
dotenv.config();

const natural = require('natural'); // NLP 라이브러리
const tokenizer = new natural.WordTokenizer();
const OpenAI = require('openai');
const { questionDB } = require('../../../db');

const analyzeKeywords = async (questions) => {
    const keywordPromises = questions.map(async question => {
        const tokens = tokenizer.tokenize(question.questionText);
        // 불용어 제거 및 명사만 추출 (간단한 예제)
        const keywords = tokens.filter(token => natural.LancasterStemmer.stem(token));
        return {
            questionId: question.id,
            topic: question.topic,
            keywords,
            answer: question.answer
        };
    });
    return Promise.all(keywordPromises);
};

const getInsights = async (keywords) => {
    const openai = new OpenAI({
        apiKey: process.env['OPENAI_API_KEY'],
    });

    const prompt = `다음의 성과 데이터를 분석하고 개선이 필요한 분야에 대한 인사이트를 제공하고, 부족한 부분에 대한 공부 방향을 말해주기.
    []에 해당하는 부분은 너가 보완해서 제공해줘
    아래는의 템플릿을 기반으로 제공해줘:

    총 {총 문제 수}개의 문제를 풀었는데 {맞춘 문제 수}문제를 맞았고, {틀린 문제 수}문제를 틀렸습니다. 정답률은 {정답률}%입니다.

    분석 결과, 맞추지 못한 문제를 살펴보면 {부족한 이해 부분 1}, {부족한 이해 부분 2}, {부족한 이해 부분 3}에 대한 이해가 부족한 것으로 보입니다.

    [따라서, {부족한 이해 부분 1}, {부족한 이해 부분 2}, {부족한 이해 부분 3}에 대해 어떻게 공부를 해야할지에 대해서 학습방법을 제공해줘

    더 많은 예제 문제를 풀어보면서 개념을 익히고 이해하는 것이 중요할 것입니다. 부족한 부분을 보완하고 성과를 더 높이기 위해 노력해야 합니다.]
    성과 데이터: ${JSON.stringify(keywords)}`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{
                role: 'user',
                content: prompt,
            }],
        });

        let generatedContent = response.choices[0].message.content;
        console.log("OpenAI API Response:", generatedContent); // 응답 내용 로그 추가

        return generatedContent; // JSON 부분 추출 대신 텍스트 전체 반환
    } catch (error) {
        console.error('Error calling the GPT API:', error);
        throw error;
    }
};

module.exports = async (req, res) => {
    const { accesstoken } = req.headers;

    if (!accesstoken) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));

    let client;

    try {
        client = await db.connect(req);
        const decodedToken = jwtHandlers.verify(accesstoken);
        const userId = decodedToken.email;

        if (!userId) {
            return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
        }

        const questions = await questionDB.allQuestionByemail(client, userId);

        if (questions.length === 0) {
            return res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.NO_CONTENT));
        }

        const keywords = await analyzeKeywords(questions);
        const insights = await getInsights(keywords);

        res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.SUCCESS, { insights }));
    } catch (error) {
        functions.logger.error(`[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`, `[CONTENT] ${error}`);
        console.log(error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
    } finally {
        client.release();
    }
};
