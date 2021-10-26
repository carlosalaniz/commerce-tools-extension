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

app.get('/orders', async (req, res) => {
    const orderlist = await commercetoolsApi.getorders();
    const ordercount = orderlist.count;
    error = "";
    message = "";
    res.render('orders',
        {
            count: ordercount,
            orderlist: orderlist.results,
            total: orderlist.total,
            moment: moment,
            amountConversion: paymentService.convertCentToAmount
        });
})

app.get('/paymentdetails', async (req, res) => {
    var convertedpaymentid;
    let pendingCaptureAmount = 0;
    var paymentid = req.query.id;
    convertedpaymentid = paymentid;
    convertedpaymentid = convertedpaymentid.replace(/\s+/g, "");
    const paymentdetails = await commercetoolsApi.retrievePayment(convertedpaymentid);
    const refundTransaction = paymentdetails.transactions;
    let authReversalFlag = false;
    refundTransaction.forEach(transaction => {
      if(transaction.type == "CancelAuthorization" && transaction.state == "Success")
      {
        authReversalFlag = true;
      }
    });
    if(!authReversalFlag) {
      pendingCaptureAmount = paymentService.getCapturedAmount(paymentdetails);
    }
    res.render('paymentdetails', {
      id: convertedpaymentid,
      payments: paymentdetails,
      captureAmount: pendingCaptureAmount,
      amountConversion: paymentService.convertCentToAmount,
      error: error,
      message:message,
  })
})

app.post('/api/extension/payment/create', async(req, res) => {
  const paymentObj = req.body.resource.obj;
  const paymentMethod = paymentObj.paymentMethodInfo.method;
  let response = {};
  switch(paymentMethod) {
    case "creditCard": {
      const microFormKeys = await flexKeys.keys();
      if(microFormKeys) {
        const actions = flexKeys.fieldMapper(microFormKeys);
          response = {
          actions: actions,
          errors: []
        }; 
      } 
      else {
        response = paymentService.getEmptyResponse(); 
      }
      break;
    }
    case "visaCheckout": {
      response = paymentService.getEmptyResponse(); 
    }
  }
  res.send(response);
});

app.post('/api/extension/payment/update', async (req, res) => {
  var updateResponse;
  var cartObj;
  const updatePaymentObj = req.body.resource.obj;
  if(updatePaymentObj.transactions.length > 0) { //If there is no transaction created for the payment
    const updateTransactions = updatePaymentObj.transactions.pop();
    if(updateTransactions.type == "Authorization") {
      updateResponse = await paymentHandler.authorizationHandler(updatePaymentObj, cartObj, updateTransactions); 
    } else {
      updateResponse = await paymentHandler.orderManagementHandler(req.body.resource.id, updatePaymentObj, updateTransactions); 
    }
  } else {
    updateResponse = paymentService.getEmptyResponse();
  }
res.send(updateResponse);
});

app.get('/capture', async (req, res) => {
  const paymentId = req.query.id;
  try {
    const capturePaymentObj = await commercetoolsApi.retrievePayment(paymentId);
    const transactionObject = {
      paymentId: paymentId,
      version: capturePaymentObj.version,
      amount: capturePaymentObj.amountPlanned,
      type: "Charge",
      state: "Initial"
    };
    const transactionresponse = await commercetoolsApi.addTransaction(transactionObject);
    const latestTransaction = transactionresponse.transactions.pop();
    if (latestTransaction.type == "Charge" && latestTransaction.state == "Success") {
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

app.get('/refund', async (req,res) => {
  var paymentId = req.query.refundId;
  var refundAmount = Number(req.query.refundAmount);
  const refundPaymentObj = await commercetoolsApi.retrievePayment(paymentId);
  const pendingCaptureAmount = paymentService.getCapturedAmount(refundPaymentObj);
  if(refundAmount > pendingCaptureAmount)
  {
    error = "Cannot perform refund - amount exceeded captured amount";
    message = "";
  }
  else {
    refundPaymentObj.amountPlanned.centAmount =  paymentService.convertAmountToCent(refundAmount);
    const transactionObject = {
      paymentId: paymentId,
      version: refundPaymentObj.version,
      amount: refundPaymentObj.amountPlanned,
      type: "Refund",
      state: "Initial"
    };
    const addTransaction = await commercetoolsApi.addTransaction(transactionObject);
    const latestTransaction = addTransaction.transactions.pop();
    if (latestTransaction.type == "Refund" && latestTransaction.state == "Success") {
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

app.get('/authReversal',async (req,res)=>{
  var paymentId = req.query.id;
  var authReversalObj = await commercetoolsApi.retrievePayment(paymentId);
  const transactionObject = {
    paymentId: paymentId,
    version: authReversalObj.version,
    amount: authReversalObj.amountPlanned,
    type: "CancelAuthorization",
    state: "Initial"
  };
  const addTransaction = await commercetoolsApi.addTransaction(transactionObject);
  const latestTransaction = addTransaction.transactions.pop();
  if (latestTransaction.type == "CancelAuthorization" && latestTransaction.state == "Success") {
    message = "Authorization reversal is completed successfully";
    error = "";
  }
  else {
    error = "Error in triggering Authorization reversal service";
    message = "";
  }
  res.redirect(`/paymentdetails?id=${req.query.id}`);
})