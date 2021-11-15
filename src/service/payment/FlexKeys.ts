/* eslint-disable functional/immutable-data */
import cybersourceRestApi from 'cybersource-rest-client';
import jwt from 'jsonwebtoken';
import jwt_decode from 'jwt-decode';

const keys = async () => {
    let isv_tokenCaptureContextSignature = "";
    let isv_tokenVerificationContext = null;
    let contextWithoutSignature = "";
    let parsedContext = "";
    const format = "JWT";
    const apiClient = new cybersourceRestApi.ApiClient();
    const configObject = {
        'authenticationType': process.env.CONFIG_AUTHENTICATION_TYPE,
        'runEnvironment': process.env.CONFIG_RUN_ENVIRONMENT,
        'merchantID': process.env.CYBS_MERCHANT_ID,
        'merchantKeyId': process.env.CYBS_MERCHANT_KEY_ID,
        'merchantsecretKey': process.env.CYBS_MERCHANT_SECRET_KEY,
    };
    // eslint-disable-next-line no-var
    var requestObj = new cybersourceRestApi.GeneratePublicKeyRequest();
    requestObj.encryptionType = process.env.CONFIG_ENCRYPTION_TYPE;
    requestObj.targetOrigin = process.env.CONFIG_TARGET_ORIGIN;
    const instance = new cybersourceRestApi.KeyGenerationApi(configObject, apiClient);
    return await new Promise(function (resolve, reject) {
        instance.generatePublicKey(format, requestObj, function (error, data, response) {
            if (error) {
                console.log('\nFailed to generate one time key for Flex token : ' + JSON.stringify(error));
                isv_tokenCaptureContextSignature = "";
                isv_tokenVerificationContext = null;
                reject(new Error(error));
            }
            else if (data) {
                isv_tokenCaptureContextSignature = data.keyId;
                contextWithoutSignature = isv_tokenCaptureContextSignature.substring(0, isv_tokenCaptureContextSignature.lastIndexOf('.') + 1);
                parsedContext = jwt_decode(contextWithoutSignature);
                isv_tokenVerificationContext = jwt.sign(parsedContext, process.env.CONFIG_VERIFICATION_KEY);
                resolve({ isv_tokenCaptureContextSignature, isv_tokenVerificationContext });
            }
        });
    })
    // .catch(error => {
    //     console.log("Error: ", error);
    //     return ({ isv_tokenCaptureContextSignature, isv_tokenVerificationContext });
    // });
}

export default { keys };