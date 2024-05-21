const convertSnakeToCamel = require('../lib/convertSnakeToCamel');

//새로운 문제 만들기
const newquestion = async(client, email, questionText, answerText,result,topic)=>{
    const {rows} = await client.query(
                `
                INSERT INTO question (email, question_text, answer_text,result, created_at,topic)
                VALUES ($1, $2, $3,$4, NOW(),$5)
                RETURNING *;
                `,
                [email, questionText, answerText,result,topic]
            );
            return convertSnakeToCamel.keysToCamel(rows[0]);
}

// 푼 문제 저장하는거
const solvequestion = async(client, questionId, email, inputSovle, result)=>{
    const { rows } = await client.query(
        `
        INSERT INTO solve (question_id, email, input_sovle,result,created_at)
        VALUES ($1, $2, $3,$4, NOW())
        RETURNING *;
        `,
        [questionId, email, inputSovle,result]
    );
    return convertSnakeToCamel.keysToCamel(rows[0]);
}

// user의 문제들을 다 뽑기 (마이페이지에서도 사용 예정)
const getUserByQuestion = async (client, email) => {
    const { rows } = await client.query(
        `
        SELECT * FROM question
        WHERE email = $1
        ORDER BY created_at DESC
        `,
        [email]
    );
    return convertSnakeToCamel.keysToCamel(rows);
};

const getQeustionByanswer = async (client, questionId) => {
    const { rows } = await client.query(
        `
        SELECT question_text, result FROM question
        WHERE id = $1
        `,
        [questionId]
    );
    return convertSnakeToCamel.keysToCamel(rows[0]);
}

const savequalquestion = async (client, questionId,email,answer,answerData)=>{   
    const { rows } = await client.query(
    `
    INSERT INTO slist (question_id, email, answer, answer_data,created_at,updated_at)
        VALUES ($1, $2, $3, $4, NOW(),NOW())
        RETURNING *;
    `,
    [questionId,email,answer,answerData]
);
return convertSnakeToCamel.keysToCamel(rows);
}

const getUserByQuestionAndTopic =async (client, questionId) => {
    const { rows } = await client.query(
        `
        SELECT question_text, topic FROM question
        WHERE id = $1
        `,
        [questionId]
    );
    return convertSnakeToCamel.keysToCamel(rows[0]);
}

const getProblemsByTopic = async (client, topic) => {
    const { rows } = await client.query(`
        SELECT id, question_text AS text, topic
        FROM question
        WHERE topic = $1
    `, [topic]);
    return convertSnakeToCamel.keysToCamel(rows);
};

const getQuestionCountByTopic = async (client, email) => {
    const { rows } = await client.query(
        `
        SELECT topic, COUNT(*) AS count
        FROM question
        WHERE email = $1
        GROUP BY topic
        `,
        [email]
    );
    return convertSnakeToCamel.keysToCamel(rows);
};

const getQuestionsWithStatus = async (client, email) => {
    const { rows } = await client.query(
        `
        SELECT q.id, q.question_text, q.topic,
            CASE
                WHEN s.answer = '정답' THEN '정답'
                WHEN s.answer = '오답' THEN '오답'
                ELSE '미답변'
            END AS status
        FROM question q
        LEFT JOIN slist s ON q.id = s.question_id AND s.email = $1
        WHERE q.email = $1
        ORDER BY q.created_at DESC
        `,
        [email]
    );
    return convertSnakeToCamel.keysToCamel(rows);
};

const repeatQuestionSolve = async (client, email, questionId) => {
    const { rows } = await client.query(
        `
        SELECT q.id, q.question_text, q.answer_text, s.input_sovle, s.result
        FROM question q
        LEFT JOIN solve s ON q.id = s.question_id AND s.email = $1
        WHERE q.id = $2 AND q.email = $1
        ORDER BY s.created_at DESC
        LIMIT 1
        `,
        [email, questionId]
    );
    return convertSnakeToCamel.keysToCamel(rows[0]);
}
const getQeustionByQanswer = async (client, questionId) => {
    const { rows } = await client.query(
        `
        SELECT answer_text, result FROM question
        WHERE id = $1
        `,
        [questionId]
    );
    return convertSnakeToCamel.keysToCamel(rows[0]);
}
module.exports = {newquestion,solvequestion,getUserByQuestion,getQeustionByanswer,savequalquestion,getUserByQuestionAndTopic,getProblemsByTopic,getQuestionCountByTopic,getQuestionsWithStatus,repeatQuestionSolve,getQeustionByQanswer};