const convertSnakeToCamel = require('../lib/convertSnakeToCamel');

//새로운 문제 만들기
const newquestion = async(client, email, questionText, answerText,result)=>{
    const {rows} = await client.query(
                `
                INSERT INTO question (email, question_text, answer_text,result, created_at)
                VALUES ($1, $2, $3,$4, NOW())
                RETURNING *;
                `,
                [email, questionText, answerText,result]
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

module.exports = {newquestion,solvequestion,getUserByQuestion,getQeustionByanswer,savequalquestion};