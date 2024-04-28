const functions = require('firebase-functions');
const admin = require('firebase-admin');
const util = require('../../../lib/util');
const statusCode = require('../../../constants/statusCode');
const responseMessage = require('../../../constants/responseMessage');

module.exports = async (req, res) => {
    // 헤더에서 accessToken 받기
    const { password: newPassword } = req.body; // 이렇게 newPassword를 추출
    const accesstoken = req.headers.authorization?.split(' ')[1]; // Bearer 토큰 추출
    

    // 필요한 값 검증
    if (!accesstoken || !newPassword) {
        return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }

    try {
        // accessToken을 통해 사용자의 UID 검증 및 추출
        const decodedToken = await admin.auth().verifyIdToken(accesstoken);
        const userId = decodedToken.uid;

        // Firebase Authentication을 통해 사용자의 비밀번호 업데이트
        await admin.auth().updateUser(userId, {
            password: newPassword
        });

        // 비밀번호 업데이트 성공 응답
        res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.PASSWORD_CHANGE_SUCCESS));
    } catch (error) {
        // 로그 출력과 에러 응답 처리
        functions.logger.error(`[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`, `[CONTENT] ${error}`);
        console.error(error);

        // 에러에 따른 상태 코드 분류 및 응답
        if (error.code === 'auth/id-token-expired') {
            res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN_EXPIRED));
        } else {
            res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
        }
    }
};
