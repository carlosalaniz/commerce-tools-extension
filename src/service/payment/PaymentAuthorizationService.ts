var cybersourceRestApi = require('cybersource-rest-client');
import paymentService from '../../utils/PaymentService'; 

const getAuthorizationResponse = async(payment, cart) => {
    let paymentResponse = {
        httpCode: null,
        transactionId: null,
        status: null,
        message: null
    };
    return new Promise(function (resolve, reject) {
        let j = 0;
        const apiClient = new cybersourceRestApi.ApiClient();
        var requestObj = new cybersourceRestApi.CreatePaymentRequest();
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

        var processingInformation = new cybersourceRestApi.Ptsv2paymentsProcessingInformation();
        if (process.env.CYBS_DECISION_MANAGER == "false") {
            processingInformation.actionList = "DECISION_SKIP";
        }
        else {
            processingInformation.actionList = "";
        }
        requestObj.processingInformation = processingInformation;

        const totalAmount = paymentService.convertCentToAmount(payment.amountPlanned.centAmount);

        var orderInformation = new cybersourceRestApi.Ptsv2paymentsOrderInformation();
        var orderInformationAmountDetails = new cybersourceRestApi.Ptsv2paymentsOrderInformationAmountDetails();
        orderInformationAmountDetails.totalAmount = totalAmount;
        orderInformationAmountDetails.currency = payment.amountPlanned.currencyCode;
        orderInformation.amountDetails = orderInformationAmountDetails;

        var orderInformationBillTo = new cybersourceRestApi.Ptsv2paymentsOrderInformationBillTo();
        orderInformationBillTo.firstName = cart.billingAddress.firstName;
        orderInformationBillTo.lastName = cart.billingAddress.lastName;
        orderInformationBillTo.address1 = cart.billingAddress.streetName;
        orderInformationBillTo.locality = cart.billingAddress.city;
        orderInformationBillTo.administrativeArea = cart.billingAddress.region;
        orderInformationBillTo.postalCode = cart.billingAddress.postalCode;
        orderInformationBillTo.country = cart.billingAddress.country;
        orderInformationBillTo.email = cart.billingAddress.email;
        orderInformationBillTo.phoneNumber = cart.billingAddress.phoneNumber;
        orderInformation.billTo = orderInformationBillTo;
        requestObj.orderInformation = orderInformation;

        var orderInformationShipTo = new cybersourceRestApi.Ptsv2paymentsOrderInformationShipTo();
        orderInformationShipTo.firstName = cart.shippingAddress.firstName;
        orderInformationShipTo.lastName = cart.shippingAddress.lastName;
        orderInformationShipTo.address1 = cart.shippingAddress.streetName;
        orderInformationShipTo.locality = cart.shippingAddress.city;
        orderInformationShipTo.administrativeArea = cart.shippingAddress.region;
        orderInformationShipTo.postalCode = cart.shippingAddress.postalCode;
        orderInformationShipTo.country = cart.shippingAddress.country;
        orderInformationShipTo.email = cart.shippingAddress.email;
        orderInformationShipTo.phoneNumber = cart.shippingAddress.phone;
        orderInformation.shipTo = orderInformationShipTo;
        requestObj.orderInformation = orderInformation;

        orderInformation.lineItems= [];
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

        if(payment.paymentMethodInfo.method == "creditCard") {
            var tokenInformation = new cybersourceRestApi.Ptsv2paymentsTokenInformation();
            tokenInformation.transientTokenJwt = payment.custom.fields.isv_token;
            requestObj.tokenInformation = tokenInformation;
        } else if(payment.paymentMethodInfo.method == "visaCheckout") {
            var processingInformation = new cybersourceRestApi.Ptsv2paymentsProcessingInformation();
            processingInformation.paymentSolution = payment.paymentMethodInfo.method;
            processingInformation.visaCheckoutId = payment.custom.fields.isv_token;
            requestObj.processingInformation = processingInformation;
        }

        const instance = new cybersourceRestApi.PaymentsApi(configObject, apiClient);
        instance.createPayment( requestObj, function (error, data, response) {
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

 export default { getAuthorizationResponse }
