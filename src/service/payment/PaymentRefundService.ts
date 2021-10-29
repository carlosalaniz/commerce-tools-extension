var cybersourceRestApi = require('cybersource-rest-client');
import paymentService from '../../utils/PaymentService'; 

const refundResponse = async (payment, captureId, updateTransactions) => {
    let paymentResponse = {
        httpCode: null,
        transactionId: null,
        status: null,
        message: null
    };
    return new Promise(function (resolve, reject) {
        const apiClient = new cybersourceRestApi.ApiClient();
        var requestObj = new cybersourceRestApi.RefundPaymentRequest();
        const configObject = {
            'authenticationType': process.env.CONFIG_AUTHENTICATION_TYPE,	
            'runEnvironment': process.env.CONFIG_RUN_ENVIRONMENT,
            'merchantID': process.env.CYBS_MERCHANT_ID,
            'merchantKeyId': process.env.CYBS_MERCHANT_KEY_ID,
            'merchantsecretKey': process.env.CYBS_MERCHANT_SECRET_KEY,
        };
        var clientReferenceInformation = new cybersourceRestApi.Ptsv2paymentsClientReferenceInformation();
        clientReferenceInformation.code = payment.id;
        requestObj.clientReferenceInformation = clientReferenceInformation;

        var clientReferenceInformationpartner = new cybersourceRestApi.Ptsv2paymentsClientReferenceInformationPartner();
        clientReferenceInformationpartner.solutionId = process.env.CYBS_PARTNER_SOLUTION_ID;
        clientReferenceInformation.partner = clientReferenceInformationpartner;
        requestObj.clientReferenceInformation = clientReferenceInformation;

        if ("visaCheckout" == payment.paymentMethodInfo.method) {
            var processingInformation = new cybersourceRestApi.Ptsv2paymentsProcessingInformation();
            processingInformation.paymentSolution = payment.paymentMethodInfo.method;
            processingInformation.visaCheckoutId = payment.custom.fields.isv_token;
            requestObj.processingInformation = processingInformation;
        }

        var orderInformation = new cybersourceRestApi.Ptsv2paymentsidrefundsOrderInformation();
		var orderInformationAmountDetails = new cybersourceRestApi.Ptsv2paymentsidcapturesOrderInformationAmountDetails();

        const refundAmount = paymentService.convertCentToAmount(updateTransactions.amount.centAmount);
        
        orderInformationAmountDetails.totalAmount = refundAmount;
        orderInformationAmountDetails.currency = payment.amountPlanned.currencyCode;
        orderInformation.amountDetails = orderInformationAmountDetails;

        requestObj.orderInformation = orderInformation;

        const instance = new cybersourceRestApi.RefundApi(configObject, apiClient);
        instance.refundPayment(requestObj, captureId, function (error, data, response) {
            if(error) {
                const errorData = JSON.parse(error.response.text.replace('/\/', ''));
                paymentResponse.httpCode = error.status;
                paymentResponse.transactionId = errorData.id;
                paymentResponse.status = errorData.status;
                paymentResponse.message = errorData.message;
            }
            else if (data) {
                paymentResponse.httpCode = response['statusCode'];
                paymentResponse.transactionId = data.id;
                paymentResponse.status = data.status;
                paymentResponse.message = data.message;
            }  
            resolve(paymentResponse);
        });
    }).catch(error => { 
        console.log("Error: ", error);
        return paymentResponse;
    });
}


export default { refundResponse }