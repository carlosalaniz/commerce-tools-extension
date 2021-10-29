import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import moment from 'moment';
import path from 'path';

import flexKeys from './service/payment/FlexKeys';
import commercetoolsApi from './utils/api/CommercetoolsApi';
import paymentHandler from './utils//PaymentHandler';
import paymentService from './utils/PaymentService'; 

dotenv.config();
const app = express();
const port = process.env.CONFIG_PORT;
let error, message = "";
app.use(cors());
app.use(express.json());

app.listen(port, () => {
  console.log(`Application running on port:${port}`);
});


app.set("views", path.join(__dirname, "views/"));
app.set("view engine", "ejs");

app.get('/orders', async(req, res) => {
  let orderResult: any;
  let ordercount = 0;
  let total = 0;
  let ordersList: any;
  error = "";
  message = "";
  ordersList = await commercetoolsApi.getorders();
  if(null != ordersList) {
    ordercount = ordersList.count;
    orderResult = ordersList.results;
    total = ordersList.total;
  }
  res.render('orders',
  {
      count: ordercount,
      orderlist: orderResult,
      total: total,
      moment: moment,
      amountConversion: paymentService.convertCentToAmount
  });
})

app.get('/paymentdetails', async(req, res) => {
    let paymentId;
    let paymentDetails: any;
    let convertedPaymentId = "";
    let pendingCaptureAmount = 0.0;
    let authReversalFlag = false;
    if("id" in req.query) {
      paymentId = req.query.id;
      convertedPaymentId = paymentId.replace(/\s+/g, "");
      paymentDetails = await commercetoolsApi.retrievePayment(convertedPaymentId);
      if(null != paymentDetails) {
        const refundTransaction = paymentDetails.transactions;
        if(null != refundTransaction) {
          refundTransaction.forEach(transaction => {
            if("CancelAuthorization" == transaction.type && "Success" == transaction.state)
            {
              authReversalFlag = true;
            }
          });
          if(!authReversalFlag) {
            pendingCaptureAmount = paymentService.getCapturedAmount(paymentDetails);
          }
        }
      }
    }
    res.render('paymentdetails', {
      id: convertedPaymentId,
      payments: paymentDetails,
      captureAmount: pendingCaptureAmount,
      amountConversion: paymentService.convertCentToAmount,
      error: error,
      message:message,
  })
})

app.post('/api/extension/payment/create', async(req, res) => {
  let response = {};
  let actions = [];
  let paymentObj: any;
  let microFormKeys: any;
  let paymentMethod = "";
  if(("body" in req) && ("resource" in req.body) && ("obj" in req.body.resource)) {
    paymentObj = req.body.resource.obj;
    paymentMethod = paymentObj.paymentMethodInfo.method;
    if(paymentMethod) {
      switch(paymentMethod) {
        case "creditCard": {
          microFormKeys =  await flexKeys.keys();
          if(null != microFormKeys) {
              actions = paymentService.fieldMapper(microFormKeys);
              response = {
              actions: actions,
              errors: []
            }; 
          } 
          else { 
            response = paymentService.invalidOperationResponse(); 
          }
          break;
        }
        case "visaCheckout": {
          response = paymentService.getEmptyResponse(); 
        }
      }
    }
    else {
      console.log("Payment details doesn't contain payment method");
      response = paymentService.getEmptyResponse(); 
    }
  }
  else {
    console.log("Unable to recieve data from Commercetools");
    response = paymentService.getEmptyResponse(); 
  }
  res.send(response);
});

app.post('/api/extension/payment/update', async(req, res) => {
  let updateResponse = {};
  let updatePaymentObj: any;
  let updateTransactions: any;
  if(("body" in req) && ("resource" in req.body) && ("obj" in req.body.resource)) {
    updatePaymentObj = req.body.resource.obj;
    if(0 < updatePaymentObj.transactions.length) { //If there is no transaction created for the payment
      updateTransactions = updatePaymentObj.transactions.pop();
      if("Authorization" == updateTransactions.type) {
        updateResponse = await paymentHandler.authorizationHandler(updatePaymentObj, updateTransactions); 
      } else {
        updateResponse = await paymentHandler.orderManagementHandler(req.body.resource.id, updatePaymentObj, updateTransactions); 
      }
    } else {
      updateResponse = paymentService.invalidInputResponse();
    } 
  }
  else {
    console.log("Unable to recieve data from Commercetools");
    updateResponse = paymentService.getEmptyResponse(); 
  }
  res.send(updateResponse);
});

app.get('/capture', async(req, res) => {
  let capturePaymentObj: any;
  let transactionresponse: any;
  let transactionObject: any;
  let latestTransaction: any;
  const paymentId = req.query.id;
  try {
    capturePaymentObj = await commercetoolsApi.retrievePayment(paymentId);
    transactionObject = {
      paymentId: paymentId,
      version: capturePaymentObj.version,
      amount: capturePaymentObj.amountPlanned,
      type: "Charge",
      state: "Initial"
    };
    transactionresponse = await commercetoolsApi.addTransaction(transactionObject);
    latestTransaction = transactionresponse.transactions.pop();
    if ("Charge" == latestTransaction.type && "Success" == latestTransaction.state) {
      message = "Capture is completed successfully"
      error = "";
      }
    else {
      message = "";
      error = "Error in triggering capture service";
      }
  } catch(e) {
    console.log("Error: ", e);
  } 
  res.redirect(`/paymentdetails?id=${paymentId}`)
});

app.get('/refund', async(req,res) => {
  let refundPaymentObj : any;
  let addTransaction: any;
  let transactionObject: any;
  let latestTransaction: any;
  let pendingCaptureAmount = 0.0;
  var paymentId = req.query.refundId;
  var refundAmount = Number(req.query.refundAmount);
  refundPaymentObj = await commercetoolsApi.retrievePayment(paymentId);
  pendingCaptureAmount = paymentService.getCapturedAmount(refundPaymentObj);
  if(0 == refundAmount){
    error = "Refund amount should be greater than zero";
    message = "";
  }
  else if(refundAmount > pendingCaptureAmount)
  {
    error = "Cannot perform refund - amount exceeded captured amount";
    message = "";
  }
  else {
    refundPaymentObj.amountPlanned.centAmount =  paymentService.convertAmountToCent(refundAmount);
    transactionObject = {
      paymentId: paymentId,
      version: refundPaymentObj.version,
      amount: refundPaymentObj.amountPlanned,
      type: "Refund",
      state: "Initial"
    };
    addTransaction = await commercetoolsApi.addTransaction(transactionObject);
    latestTransaction = addTransaction.transactions.pop();
    if ("Refund" == latestTransaction.type && "Success" == latestTransaction.state) {
      message = "Refund is completed successfully";
      error = "";
    }
    else {
      error = "Error in triggering refund service";
      message = "";
    }
  }
  res.redirect(`/paymentdetails?id=${paymentId}`)
})

app.get('/authReversal', async(req,res)=>{
  let authReversalObj: any;
  let addTransaction: any;
  let transactionObject: any;
  let latestTransaction: any;
  var paymentId = req.query.id;
  authReversalObj = await commercetoolsApi.retrievePayment(paymentId);
  transactionObject = {
    paymentId: paymentId,
    version: authReversalObj.version,
    amount: authReversalObj.amountPlanned,
    type: "CancelAuthorization",
    state: "Initial"
  };
  addTransaction = await commercetoolsApi.addTransaction(transactionObject);
  latestTransaction = addTransaction.transactions.pop();
  if ("CancelAuthorization" == latestTransaction.type && "Success" == latestTransaction.state) {
    message = "Authorization reversal is completed successfully";
    error = "";
  }
  else {
    error = "Error in triggering Authorization reversal service";
    message = "";
  }
  res.redirect(`/paymentdetails?id=${req.query.id}`);
})