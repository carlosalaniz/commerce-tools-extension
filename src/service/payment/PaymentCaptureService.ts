var cybersourceRestApi = require('cybersource-rest-client');
import paymentService from '../../utils/PaymentService'; 

const captureResponse = async (payment, cart, authId) => {
    let j=0;
    let paymentResponse = {
        httpCode: null,
        transactionId: null,
        status: null,
        message: null
    };
    return new Promise(function (resolve, reject) {
        const apiClient = new cybersourceRestApi.ApiClient();
        var requestObj = new cybersourceRestApi.CapturePaymentRequest();
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

        const totalAmount = paymentService.convertCentToAmount(payment.amountPlanned.centAmount);

        var orderInformation = new cybersourceRestApi.Ptsv2paymentsidcapturesOrderInformation();
        var orderInformationAmountDetails = new cybersourceRestApi.Ptsv2paymentsidcapturesOrderInformationAmountDetails();
        orderInformationAmountDetails.totalAmount = totalAmount;
        orderInformationAmountDetails.currency = payment.amountPlanned.currencyCode;
        orderInformation.amountDetails = orderInformationAmountDetails;

        orderInformation.lineItems= [];
        cart.lineItems.forEach(lineItem => {
            var  orderInformationLineItems = new cybersourceRestApi.Ptsv2paymentsOrderInformationLineItems();
            const unitPrice = paymentService.convertCentToAmount(lineItem.price.value.centAmount);
            orderInformationLineItems.productName = lineItem.name.en;
            orderInformationLineItems.quantity = lineItem.quantity;
            orderInformationLineItems.productSku = lineItem.variant.sku;
            orderInformationLineItems.productCode = lineItem.productId;
            orderInformationLineItems.unitPrice = unitPrice;
            orderInformation.lineItems[j] = orderInformationLineItems;
            j++;
        });
        if('shippingInfo' in cart){
            const shippingCost = paymentService.convertCentToAmount(cart.shippingInfo.price.centAmount);
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
        const instance = new cybersourceRestApi.CaptureApi(configObject, apiClient);
        instance.capturePayment(requestObj, authId, function (error, data, response) {
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

export default { captureResponse }