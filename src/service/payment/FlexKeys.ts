/* eslint-disable functional/immutable-data */
import cybersourceRestApi from 'cybersource-rest-client';
import jwt from 'jsonwebtoken';
import jwt_decode from 'jwt-decode';

const keys = () => { 
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
    return new Promise(function (resolve, reject) {
        instance.generatePublicKey(format, requestObj, function (error, data, response) {
            if (error) {
                console.log('\nFailed to generate one time key for Flex token : ' + JSON.stringify(error));
                const isv_tokenCaptureContextSignature = null;
                const isv_tokenVerificationContext = null;
                resolve({isv_tokenCaptureContextSignature, isv_tokenVerificationContext});
            }
            else if (data) {
             const isv_tokenCaptureContextSignature = data.keyId;
             const contextWithoutSignature = isv_tokenCaptureContextSignature.substring(0, isv_tokenCaptureContextSignature.lastIndexOf('.') + 1);
             const parsedContext = jwt_decode(contextWithoutSignature);
             const isv_tokenVerificationContext = jwt.sign(parsedContext, process.env.CONFIG_VERIFICATION_KEY);
             resolve({isv_tokenCaptureContextSignature, isv_tokenVerificationContext});
          }
        });
    }).catch(error => {
        console.log("Error: ", error);
        const isv_tokenCaptureContextSignature = null;
        const isv_tokenVerificationContext = null;
        return ({isv_tokenCaptureContextSignature, isv_tokenVerificationContext});
    });
 }

const fieldMapper = (fields) => {
    let actions = [] as  any;
    const keys = Object.keys(fields);
    keys.forEach((key, index) => {
        actions.push(
        {
            'action': 'setCustomField',
            'name': key,
            'value': fields[key],
        });
    });
    return actions;
}

export default { keys, fieldMapper};