import authorization from './../service/payment/PaymentAuthorizationService';
import paymentService from './../utils/PaymentService'; 
import commercetoolsApi from './../utils/api/CommercetoolsApi';
import paymentCapture from './../service/payment/PaymentCaptureService';
import paymentRefund from './../service/payment/PaymentRefundService';
import paymentAuthReversal from './../service/payment/PaymentAuthorizationReversal';
import clickToPay from '../service/payment/ClickToPayDetails';

const authorizationHandler = async(updatePaymentObj, cartObj, updateTransactions) => {
    var authResponse;
    const transactionObj = paymentService.transactionDetails(updateTransactions);
    if("customer" in updatePaymentObj) {
        cartObj = await commercetoolsApi.retrieveCartByCustomerId(updatePaymentObj.customer.id);
    } else {
        cartObj = await commercetoolsApi.retrieveCartByAnonymousId(updatePaymentObj.anonymousId);
    }
    if(cartObj) {
        const paymentMethod = updatePaymentObj.paymentMethodInfo.method;
        switch(paymentMethod){
            case "creditCard": {
                var paymentResponse = await authorization.getAuthorizationResponse(updatePaymentObj, cartObj.results[0]);
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
                var paymentResponse = await authorization.getAuthorizationResponse(updatePaymentObj, cartObj.results[0]);
                authResponse = paymentService.getAuthResponse(paymentResponse, transactionObj);
                const visaCheckoutData = await clickToPay.getVisaCheckoutData(paymentResponse);
                if(paymentResponse == 201 && visaCheckoutData) {
                    const actions = paymentService.visaCardDetailsAction(visaCheckoutData); 
                    actions.forEach(i => {
                        authResponse.actions.push(i);
                        });
                    var cartUpdate = await commercetoolsApi.updateCartbyPaymentId(cartObj, visaCheckoutData);
                    console.log("cartUpdate =", cartUpdate);
                }
                break;
            }
        }
    } 
    else {
        console.log("Cart Doesn't exists");
        authResponse = paymentService.getEmptyResponse();
    }
    return authResponse;
}

const orderManagementHandler = async(paymentId, updatePaymentObj, updateTransactions) => {
    var serviceResponse;
    let authId = null;
    let captureId = null;
    const cartObj = await commercetoolsApi.retrieveCartByPaymentId(paymentId);
    const transactionObj = paymentService.transactionDetails(updateTransactions);
    if(updateTransactions.type == "Charge") {
        updatePaymentObj.transactions.forEach(transaction => {
            if(transaction.type == "Authorization" && transaction.state == "Success") {
                 authId = transaction.interactionId;
            }  
        }); 
        var captureReturnResponse = await paymentCapture.captureResponse(updatePaymentObj, cartObj.results[0], authId);
        serviceResponse = paymentService.getServiceResponse(captureReturnResponse, transactionObj);
    } 
    else if (updateTransactions.type == "Refund") {
        updatePaymentObj.transactions.forEach(transaction => {
            if(transaction.type == "Charge" && transaction.state == "Success") {
                captureId = transaction.interactionId;
            }
        });
        var captureReturnResponse = await paymentRefund.refundResponse(updatePaymentObj, captureId);
        serviceResponse = paymentService.getServiceResponse(captureReturnResponse, transactionObj);
    } 
    else if(updateTransactions.type == "CancelAuthorization") {
        const authReversalId = updatePaymentObj.transactions[0].interactionId;
        const captureReturnResponse = await paymentAuthReversal.authReversalResponse(updatePaymentObj, cartObj.results[0], authReversalId);
        serviceResponse = paymentService.getServiceResponse(captureReturnResponse, transactionObj);
    } 
    else {
        serviceResponse = paymentService.getEmptyResponse(); 
    }
    return serviceResponse;
}

export default { authorizationHandler, orderManagementHandler }