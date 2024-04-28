const convertSnakeToCamel = require('../lib/convertSnakeToCamel');

const getAllUser = async(client)=>{
    const {rows} = await client.query(
        `
        SELECT * FROM "user" u 
        WHERE is_delete = False
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

const getUserByIdFirebase = async(client, idFirebase)=>{
    const {rows} = await client.query(
        `
        SELECT * FROM "user" u
        WHERE id_firebase = $1
        AND is_delete = False
        `,
        [idFirebase]
    );
    return convertSnakeToCamel.keysToCamel(rows);
}
module.exports = {getAllUser,signupUser,getUserByIdFirebase};