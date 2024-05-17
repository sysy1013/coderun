const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const evaluateWithGPT = async (questionText, correctAnswer, userSolution) => {
    const messages = [
        { role: 'system', content: 'You are an AI that evaluates coding problems. Here is a question and the expected output along with a user\'s solution and its output.' },
        { role: 'user', content: `Question:\n${questionText}\n\nExpected Output:\n${correctAnswer}\n\nUser's Solution:\n${userSolution}\n\nPlease check if the user's solution output matches the expected output. If it does, just say "정답" 다른 부가 설명 필요없어. If it doesn't, explain why the user's solution is incorrect and what the user might need to change. 한국어로 제공해줘. 간단하게 요약해서 제공해줘 정답을 제공할 필요는 없고 왜 틀렸는지와 문제를 해결할 수 있을 정도의 피드백만 주세요.` }
    ];

    try {
        const url = 'https://api.openai.com/v1/chat/completions';
        const headers = {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        };
        const data = {
            model: 'gpt-4-turbo',
            messages: messages,
            max_tokens: 3000,
            temperature: 0.7
        };

        const response = await axios.post(url, data, { headers });

        const feedback = response.data.choices[0].message.content.trim();

        let tf = "오답";
        if (feedback === "정답") {
            tf = "정답";
        }

        return {
            status: 200,
            success: true,
            tf: tf,
            data: feedback
        };
    } catch (error) {
        console.error('OpenAI API 호출 오류:', error.response ? error.response.data : error.message);
        throw new Error('GPT로 솔루션 평가에 실패했습니다.');
    }
};

module.exports = { evaluateWithGPT };
