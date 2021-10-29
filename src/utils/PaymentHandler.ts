import paymentAuthorization from './../service/payment/PaymentAuthorizationService';
import paymentService from './../utils/PaymentService'; 
import commercetoolsApi from './../utils/api/CommercetoolsApi';
import paymentCapture from './../service/payment/PaymentCaptureService';
import paymentRefund from './../service/payment/PaymentRefundService';
import paymentAuthReversal from './../service/payment/PaymentAuthorizationReversal';
import clickToPay from '../service/payment/ClickToPayDetails';

const authorizationHandler = async(updatePaymentObj, updateTransactions) => {
    let authResponse: any;
    let paymentResponse: any;
    let cartUpdate: any;
    let visaCheckoutData: any;
    let actions: any;
    let paymentMethod = "";
    let cartObj: any;
    try {
        const transactionObj = paymentService.transactionDetails(updateTransactions);
        if("customer" in updatePaymentObj) {
            cartObj = await commercetoolsApi.retrieveCartByCustomerId(updatePaymentObj.customer.id);
        } else {
            cartObj = await commercetoolsApi.retrieveCartByAnonymousId(updatePaymentObj.anonymousId);
        }
        if(null != cartObj) {
            paymentMethod = updatePaymentObj.paymentMethodInfo.method;
            switch(paymentMethod){
                case "creditCard": {
                    paymentResponse = await paymentAuthorization.getAuthorizationResponse(updatePaymentObj, cartObj.results[0]);
                    authResponse = paymentService.getAuthResponse(paymentResponse, transactionObj);
                    authResponse.actions.push(
                        {
                            action: 'setCustomField',
                            name: 'isv_tokenCaptureContextSignature',
                            value: null,
                            }
                    );
                    break;
                }
                case "visaCheckout": {
                    paymentResponse = await paymentAuthorization.getAuthorizationResponse(updatePaymentObj, cartObj.results[0]);
                    authResponse = paymentService.getAuthResponse(paymentResponse, transactionObj);
                    visaCheckoutData = await clickToPay.getVisaCheckoutData(paymentResponse);
                    if((paymentResponse.httpCode == 201) && (visaCheckoutData.httpCode == 200) && (null != visaCheckoutData.cardFieldGroup)) {
                        actions = paymentService.visaCardDetailsAction(visaCheckoutData); 
                        actions.forEach(i => {
                            authResponse.actions.push(i);
                            });
                        cartUpdate = await commercetoolsApi.updateCartbyPaymentId(cartObj.results[0], visaCheckoutData);
                        console.log("cartUpdate:", cartUpdate);
                    }
                    break;
                }
                default: {
                    console.log("There are no payment method available for the payment");
                    break;
                }
            }
        } 
        else {
            console.log("Cart Doesn't exists");
            authResponse = paymentService.invalidInputResponse();
        }
    }
    catch(error) {
        console.log("An exception occured while authorizing the payment: ", error);
    }
    return authResponse;
}

const orderManagementHandler = async(paymentId, updatePaymentObj, updateTransactions) => {
    let authId = null;
    let captureId = null;
    let cartObj: any;
    let orderResponse: any;
    let transactionObj: any;
    let serviceResponse: any;
    let authReversalId = null;
    try {
        cartObj = await commercetoolsApi.retrieveCartByPaymentId(paymentId);
        if(null != cartObj) {
            transactionObj = paymentService.transactionDetails(updateTransactions);
            if("Charge" == updateTransactions.type) {
                updatePaymentObj.transactions.forEach(transaction => {
                    if("Authorization" == transaction.type && "Success" == transaction.state) {
                         authId = transaction.interactionId;
                    }  
                }); 
                if(null != authId) {
                    orderResponse = await paymentCapture.captureResponse(updatePaymentObj, cartObj.results[0], authId);
                    serviceResponse = paymentService.getServiceResponse(orderResponse, transactionObj);
                }
                else {
                    console.log("Cannot process capture as there are no transaction id avaialable");
                    serviceResponse = paymentService.invalidInputResponse();
                }  
            } 
            else if ("Refund" == updateTransactions.type) {
                updatePaymentObj.transactions.forEach(transaction => {
                    if("Charge" == transaction.type && "Success" == transaction.state) {
                        captureId = transaction.interactionId;
                    }
                });
                if(null != captureId) {
                    orderResponse = await paymentRefund.refundResponse(updatePaymentObj, captureId, updateTransactions);
                    serviceResponse = paymentService.getServiceResponse(orderResponse, transactionObj);
                }
                else {
                    console.log("Cannot process refund as there are no transaction id avaialable");
                    serviceResponse = paymentService.invalidInputResponse();
                }  
            } 
            else if("CancelAuthorization" == updateTransactions.type) {
                authReversalId = updatePaymentObj.transactions[0].interactionId;
                if(null != authReversalId) {
                    orderResponse = await paymentAuthReversal.authReversalResponse(updatePaymentObj, cartObj.results[0], authReversalId);
                    serviceResponse = paymentService.getServiceResponse(orderResponse, transactionObj);
                }
                else {
                    console.log("Cannot process authorization reversal as there are no transaction id avaialable");
                    serviceResponse = paymentService.invalidInputResponse();
                }  
            } 
            else {
                console.log("There are no transactions created for %s payment", paymentId);
                serviceResponse = paymentService.invalidInputResponse(); 
            }
        }
        else {
            console.log("Cart Doesn't exists");
            serviceResponse = paymentService.invalidInputResponse(); 
        }
    }
    catch(error) {
        console.log("An exception occured while authorizing the payment: ", error);
    }
    return serviceResponse;
}

export default { authorizationHandler, orderManagementHandler }