const convertSnakeToCamel = require('../lib/convertSnakeToCamel');

const getAllUser = async(client)=>{
    const {rows} = await client.query(
        `
        SELECT * FROM "user" u 
        Where is_delete = False
        `,
    );
    return convertSnakeToCamel.keysToCamel(rows);
};

const signupUser = async(client, email, username,idFirebase)=>{
    const {rows} = await client.query(
        `
    Insert Into "user"
    (email, username, id_Firebase)
    VALUES
    ($1, $2, $3)
    RETURNING *
    `,
    [email, username, idFirebase],
    );
    return convertSnakeToCamel.keysToCamel(rows[0]);
};
module.exports = {getAllUser,signupUser};