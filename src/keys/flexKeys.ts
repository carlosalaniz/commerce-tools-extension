/* eslint-disable functional/immutable-data */
import cybersourceRestApi from 'cybersource-rest-client';
import jwt from 'jsonwebtoken';
import jwt_decode from 'jwt-decode';

export function generateKey() : Promise<any>{ 
    const format = "JWT";
    const configObject = {
            'authenticationType': process.env.CONFIG_AUTHENTICATION_TYPE,	
            'runEnvironment': process.env.CONFIG_RUN_ENVIRONMENT,
            'merchantID': process.env.CYBERSOURCE_MERCHANT_ID,
            'merchantKeyId': process.env.CYBERSOURCE_MERCHANT_KEY_ID,
            'merchantsecretKey': process.env.CYBERSOURCE_MERCHANT_SECRET_KEY,
        };
    const apiClient = new cybersourceRestApi.ApiClient();
    // eslint-disable-next-line no-var
    var requestObj = new cybersourceRestApi.GeneratePublicKeyRequest();
    requestObj.encryptionType = process.env.CONFIG_ENCRYPTION_TYPE;
    requestObj.targetOrigin = process.env.CONFIG_TARGET_ORIGIN;
    const instance = new cybersourceRestApi.KeyGenerationApi(configObject, apiClient);
    return new Promise(function (resolve, reject) {
        instance.generatePublicKey(format, requestObj, function (error, data, response) {
            if (error) {
                console.log('\nFailed to generate one time key for Flex token : ' + JSON.stringify(error));
                resolve(false);
            }
            else if (data) {
             const captureContext = data.keyId;
             const contextWithoutSignature = captureContext.substring(0, captureContext.lastIndexOf('.') + 1);
             const parsedContext = jwt_decode(contextWithoutSignature);
             const verificationContext = jwt.sign(parsedContext, process.env.CONFIG_VERIFICATION_KEY);
             resolve({captureContext, verificationContext});
          }
        });
    });
 }