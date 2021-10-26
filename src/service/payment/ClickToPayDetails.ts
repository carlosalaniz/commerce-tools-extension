import cybersourceRestApi from 'cybersource-rest-client';

const getVisaCheckoutData = (paymentResponse) => {
    let visaCheckoutData = {
        httpCode : null,
        billToFieldGroup : null,
        shipToFieldGroup : null,
        cardFieldGroup : null,
    }
    const id = paymentResponse.transactionId;
    return new Promise((resolve, reject) => {
        const configObject = {
            'authenticationType': process.env.CONFIG_AUTHENTICATION_TYPE,	
            'runEnvironment': process.env.CONFIG_RUN_ENVIRONMENT,
            'merchantID': process.env.CYBS_MERCHANT_ID,
            'merchantKeyId': process.env.CYBS_MERCHANT_KEY_ID,
            'merchantsecretKey': process.env.CYBS_MERCHANT_SECRET_KEY,
        };
        const apiClient = new cybersourceRestApi.ApiClient();
        const instance = new cybersourceRestApi.TransactionDetailsApi(configObject, apiClient);
        instance.getTransaction( id, function(error, data, response) {
            if(error)
            {
                console.log('\nError : ' + JSON.stringify(error));
                visaCheckoutData.httpCode = error.status;
                visaCheckoutData.billToFieldGroup = null;
                visaCheckoutData.shipToFieldGroup = null;
                visaCheckoutData.cardFieldGroup = null;
            }
            else if(data) {
                visaCheckoutData.httpCode = response['status'];
                visaCheckoutData.billToFieldGroup = data.orderInformation.billTo;
                visaCheckoutData.shipToFieldGroup = data.orderInformation.shipTo;
                visaCheckoutData.cardFieldGroup = data.paymentInformation.card;
            }
            console.log('\nResponse : ' + JSON.stringify(response));
            console.log('\nResponse Code of Retrieve a Transaction : ' + JSON.stringify(response['status']));
            resolve(visaCheckoutData);
        });
    }).catch(error => {
        console.log("Error: ", error);
        return visaCheckoutData;
    });
}

export default { getVisaCheckoutData }