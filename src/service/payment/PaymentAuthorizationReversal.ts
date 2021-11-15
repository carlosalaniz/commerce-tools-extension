
/* eslint-disable import/order */
/* eslint-disable functional/immutable-data */
/* eslint-disable no-var */
import cybersourceRestApi from 'cybersource-rest-client';
import dotenv from 'dotenv';
import paymentService from '../../utils/PaymentService';
dotenv.config();

const authReversalResponse = async (payment, cart, authReversalId) => {
    let j = 0;
    let shippingCost = 0.0;
    let totalAmount = 0.0;
    let paymentResponse = {
        httpCode: null,
        transactionId: null,
        status: null,
        message: null
    };
    const apiClient = new cybersourceRestApi.ApiClient();
    var requestObj = new cybersourceRestApi.AuthReversalRequest();
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

    var orderInformation = new cybersourceRestApi.Ptsv2paymentsidreversalsOrderInformation();

    orderInformation.lineItems = [];
    cart.lineItems.forEach(lineItem => {
        var orderInformationLineItems = new cybersourceRestApi.Ptsv2paymentsOrderInformationLineItems();
        const unitPrice = paymentService.convertCentToAmount(lineItem.price.value.centAmount);
        orderInformationLineItems.productName = lineItem.name.en;
        orderInformationLineItems.quantity = lineItem.quantity;
        orderInformationLineItems.productSku = lineItem.variant.sku;
        orderInformationLineItems.productCode = lineItem.productId;
        orderInformationLineItems.unitPrice = unitPrice;
        orderInformation.lineItems[j] = orderInformationLineItems;
        j++;
    });
    if ('shippingInfo' in cart) {
        shippingCost = paymentService.convertCentToAmount(cart.shippingInfo.price.centAmount);
        var orderInformationLineItems = new cybersourceRestApi.Ptsv2paymentsOrderInformationLineItems();
        orderInformationLineItems.productName = cart.shippingInfo.shippingMethodName;
        orderInformationLineItems.quantity = "1";
        orderInformationLineItems.productSku = "shipping_and_handling";
        orderInformationLineItems.productCode = "shipping_and_handling";
        orderInformationLineItems.unitPrice = shippingCost;
        orderInformationLineItems.tax = cart.shippingInfo.taxRate.amount;
        orderInformation.lineItems[j] = orderInformationLineItems;
    }
    requestObj.orderInformation = orderInformation;

    totalAmount = paymentService.convertCentToAmount(payment.amountPlanned.centAmount);

    var orderInformation = new cybersourceRestApi.Ptsv2paymentsidcapturesOrderInformation();
    var orderInformationAmountDetails = new cybersourceRestApi.Ptsv2paymentsidcapturesOrderInformationAmountDetails();
    orderInformationAmountDetails.totalAmount = totalAmount;
    orderInformationAmountDetails.currency = payment.amountPlanned.currencyCode;
    orderInformation.amountDetails = orderInformationAmountDetails;

    var instance = new cybersourceRestApi.ReversalApi(configObject, apiClient);
    return await new Promise((resolve, reject) => {
        instance.authReversal(authReversalId, requestObj, function (error, data, response) {
            if (error) {
                const errorData = JSON.parse(error.response.text.replace('/\/', ''));
                paymentResponse.httpCode = error.status;
                paymentResponse.transactionId = errorData.id;
                paymentResponse.status = errorData.status;
                paymentResponse.message = errorData.message;
                reject(paymentResponse);
            }
            else if (data) {
                paymentResponse.httpCode = response['statusCode'];
                paymentResponse.transactionId = data.id;
                paymentResponse.status = data.status;
                paymentResponse.message = data.message;
                console.log("AuthPaymentAuthorizationReversal ", JSON.stringify(paymentResponse));
                resolve(paymentResponse);
            } else {
                reject("Unexpected error");
            }
        });
    })
    // .catch(error => {
    //     console.log("Error: ", error);
    //     return paymentResponse;
    // });
}

export default { authReversalResponse }