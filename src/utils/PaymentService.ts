const transactionDetails = (trasanctionData) => {
    return {
        amount: trasanctionData.amount.centAmount,
        id: trasanctionData.id,
        state: trasanctionData.state,
        type: trasanctionData.type
    };
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

function setTransactionId(paymentResponse, transactionDetail) {
    return {
        action: 'changeTransactionInteractionId',
        interactionId: paymentResponse.transactionId,
        transactionId: transactionDetail.id
    };
}

function changeState(transactionDetail, state) {
 return {
            action: 'changeTransactionState',
            state: state,
            transactionId: transactionDetail.id,
        };
}

const failureResponse = (paymentResponse, transactionDetail) => {
    return {
        action : 'addInterfaceInteraction',
        type :
            {
                key : 'isv_payment_failure'
            },
        fields:
            {
                reasonCode : `${paymentResponse.httpCode}`,
                transactionId: transactionDetail.id
            }
        };
}

const visaCardDetailsAction = (visaCheckoutData) => {
    var cardPrefix = visaCheckoutData.cardFieldGroup.prefix;
    var cardSuffix = visaCheckoutData.cardFieldGroup.suffix;
    var maskedPan = cardPrefix.concat("...", cardSuffix);
    const actions = [
        {
            action : "setCustomField",
            name : "isv_maskedPan",
            value : maskedPan
        },
        {
            action : "setCustomField",
            name : "isv_cardExpiryMonth",
            value : visaCheckoutData.cardFieldGroup.expirationMonth
        },
        {
            action :"setCustomField",
            name :"isv_cardExpiryYear",
            value :visaCheckoutData.cardFieldGroup.expirationYear
        },
        {
            action : "setCustomField",
            name : "isv_cardType",
            value :visaCheckoutData.cardFieldGroup.type
        }
    ];
    return actions;
}

const getAuthResponse = (paymentResponse, transactionDetail) => {
    let response = {};
    if("AUTHORIZED"  == paymentResponse.status) {
        const setTransaction =  setTransactionId(paymentResponse, transactionDetail);
        const setCustomField =  changeState(transactionDetail, "Success");
        response = createResponse(setTransaction, setCustomField, null);
    } 
    else if("AUTHORIZED_PENDING_REVIEW" == paymentResponse.status) {
        const setTransaction =  setTransactionId(paymentResponse, transactionDetail);
        const setCustomField =  changeState(transactionDetail, "Pending");
        response = createResponse(setTransaction, setCustomField, null);
    } else {
        const setTransaction =  setTransactionId(paymentResponse, transactionDetail);
        const setCustomField =  changeState(transactionDetail, "Failure");
        const paymentFailure = failureResponse(paymentResponse, transactionDetail);
        response = createResponse(setTransaction, setCustomField, paymentFailure);
    }
    return response;
}

function createResponse(setTransaction, setCustomField, paymentFailure) {
    let actions = [] as any;
    let returnResponse = {};
    actions.push(setTransaction);
    actions.push(setCustomField);
    if(paymentFailure) {
        actions.push(paymentFailure);
    } 
    returnResponse =  {
        actions : actions,
        errors : []
    }
    return returnResponse;
}

const getServiceResponse = (paymentResponse, transactionDetail) => {
    let response = {};
    if("PENDING" == paymentResponse.status || "REVERSED" == paymentResponse.status){
        const setTransaction =  setTransactionId(paymentResponse, transactionDetail);
        const setCustomField =  changeState(transactionDetail, "Success");
        response = createResponse(setTransaction, setCustomField, null);
      } else {
        const setTransaction =  setTransactionId(paymentResponse, transactionDetail);
        const setCustomField =  changeState(transactionDetail, "Failure");
        const paymentFailure = failureResponse(paymentResponse, transactionDetail);
        response = createResponse(setTransaction, setCustomField, paymentFailure);
      }
    return response;
}

const convertCentToAmount = (num) => {
    return Number((num / 100).toFixed(2))*1;
}

const convertAmountToCent = (amount) => {
    return Number(amount*100);
}

const getCapturedAmount = (refundPaymentObj) => {
    let pendingCaptureAmount = 0;
    const refundTransaction = refundPaymentObj.transactions;
    const index = refundTransaction.findIndex((transaction,index) => {
      if("Charge" == transaction.type) {
        return true;
      }
      return index;
    });
    if(index >= 0){
      const capturedAmount = Number(refundTransaction[index].amount.centAmount);
      let refundedAmount = 0;
      refundTransaction.forEach(transaction => {
        if("Refund" == transaction.type && "Success" == transaction.state )
        {
          refundedAmount = refundedAmount + Number(transaction.amount.centAmount);
        }
      });
      pendingCaptureAmount = capturedAmount - refundedAmount;
      pendingCaptureAmount = convertCentToAmount(pendingCaptureAmount);
    }
    return pendingCaptureAmount;
}

const getEmptyResponse = () => {
    return {
        actions: [],
        errors: []
      };
}

const invalidOperationResponse = () => {
   return {
        actions :[],
        errors :
        [
          {
            code : "InvalidOperation",
            message : "Cannot process this payment"
          }
       ]
     };
}

const invalidInputResponse = () => {
    return {
         actions : [],
         errors :
         [
           {
             code : "InvalidInput",
             message : "Cannot process this payment due to invalid input"
           }
        ]
      };
 }
export default { fieldMapper, transactionDetails, changeState, failureResponse, getAuthResponse, getServiceResponse, convertCentToAmount, 
    convertAmountToCent, getCapturedAmount, getEmptyResponse, visaCardDetailsAction, invalidOperationResponse, invalidInputResponse }