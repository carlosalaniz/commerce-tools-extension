import fetch from 'node-fetch';
import { createRequestBuilder } from '@commercetools/api-request-builder';
import { createAuthMiddlewareForClientCredentialsFlow } from '@commercetools/sdk-middleware-auth';
import { createHttpMiddleware } from '@commercetools/sdk-middleware-http';
import { createClient } from '@commercetools/sdk-client';

function getClient() {
  let client: any;
  try {
    const projectKey = process.env.PROJECT_KEY;
    const authMiddleware = createAuthMiddlewareForClientCredentialsFlow({
      host: process.env.AUTH_HOST,
      projectKey,
      credentials: {
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
      },
      fetch,
    });
    client = createClient({
      middlewares: [
        authMiddleware,
        createHttpMiddleware({
          host: process.env.API_HOST,
          fetch,
        }),
      ],
    });
  }
  catch(error) {
    console.log("Unable to retrieve payment details: ", error);
  }
  return client;
}

const retrieveCartByAnonymousId = async(anonymousId) => {
  let anonymousIdResponse: any;
  try {
    const client = getClient();
    if(null != client) {
      const requestBuilder = createRequestBuilder({ projectKey: process.env.PROJECT_KEY });
      const uri = requestBuilder.carts
      .parse({ where: [`anonymousId = "${anonymousId}"`, `cartState="Active"`] })
      .build();
      const channelsRequest = {
        uri: uri,
        method: 'GET',
      }
      anonymousIdResponse = await client.execute(channelsRequest);
    } 
    else {
      console.log("Couldnt't connect to Commercetools");
    }
  }
  catch(error) {
    console.log("Unable to retrieve payment details: ", error);
  }
  if(null != anonymousIdResponse) {
    anonymousIdResponse = anonymousIdResponse.body;
  }
  return anonymousIdResponse;
}

const retrieveCartByCustomerId = async(customerId)=> {
  let customerIdResponse: any;
  try {
    const client = getClient();
    if(null != client) {
      const requestBuilder = createRequestBuilder({ projectKey: process.env.PROJECT_KEY });
      const uri = requestBuilder.carts
      .parse({ where: [`customerId = "${customerId}"`, `cartState="Active"`] })
      .build();
      const channelsRequest = {
        uri: uri,
        method: 'GET',
      };
      customerIdResponse = await client.execute(channelsRequest);
    }
    else {
      console.log("Couldnt't connect to Commercetools");
    }
  }
  catch(error) {
    console.log("Unable to retrieve payment details: ", error);
  }
  if(null != customerIdResponse) {
    customerIdResponse = customerIdResponse.body;
  }
  return customerIdResponse;
}

const retrieveCartByPaymentId = async(paymentId) => {
  let paymentIdResponse: any;
  try {
    const client = getClient();
    if(null != client) {
      const requestBuilder = createRequestBuilder({ projectKey: process.env.PROJECT_KEY });
      const uri = requestBuilder.carts
      .parse({ where: [`paymentInfo(payments(id="${paymentId}"))`] })
      .build();
      const channelsRequest = {
        uri: uri,
        method: 'GET',
      };
      paymentIdResponse = await client.execute(channelsRequest);
    }
    else {
      console.log("Couldnt't connect to Commercetools");
    }
  }
  catch(error) {
    console.log("Unable to retrieve payment details: ", error);
  }
  if(null != paymentIdResponse) {
    paymentIdResponse = paymentIdResponse.body;
  }
  return paymentIdResponse;
}

const retrievePayment = async(paymentId) => {
  let paymentResponse: any;
  try {
    const client = getClient();
    if(null != client) {
      const requestBuilder = createRequestBuilder({ projectKey: process.env.PROJECT_KEY });
      const uri = requestBuilder.payments
      .byId(paymentId)
      .build();
      const channelsRequest = {
        uri: uri,
        method: 'GET',
      };
      paymentResponse = await client.execute(channelsRequest);
    }
    else {
      console.log("Couldnt't connect to Commercetools");
    }
  }
  catch(error){
    console.log("Unable to retrieve payment details: ", error);
  }
  if(null != paymentResponse) {
    paymentResponse = paymentResponse.body;
  }
  return paymentResponse;
}

const addTransaction = async(transactionObject) => {
  let transactionResonse: any;
  try {
    const client = getClient();
    if(null != client) {
      const requestBuilder = createRequestBuilder({ projectKey: process.env.PROJECT_KEY });
      const uri = requestBuilder.payments
      .byId(transactionObject.paymentId)
      .build();
      const channelsRequest = {
        uri: uri,
        method: 'POST',
        body: JSON.stringify({
          version: transactionObject.version,
          actions: [
            { 
              action: "addTransaction",
              transaction: {
                type: transactionObject.type,
                amount: transactionObject.amount,
                state: transactionObject.state
              }
            }
          ]
        })
      };
      transactionResonse = await client.execute(channelsRequest);
    }
    else {
      console.log("Couldnt't connect to Commercetools");
    }
  }
  catch(error){
    console.log("Unable to retrieve payment details: ", error);
  }
  if(null != transactionResonse) {
    transactionResonse = transactionResonse.body;
  }
  return transactionResonse;
}

const getorders = async() => {
  let orderResponse: any;
  try {
    const client = getClient();
    if(null != client) {
      const requestBuilder = createRequestBuilder({ projectKey: process.env.PROJECT_KEY });
      const uri = requestBuilder.payments
      .parse({ sort: [{by: "lastModifiedAt", direction: "desc"}]}).build();
      const channelsRequest = {
        uri: uri,
        method: 'GET',
      };
      orderResponse = await client.execute(channelsRequest);
    }
    else {
      console.log("Couldnt't connect to Commercetools");
    }
  }
  catch(error) {
    console.log("Exception during fetching order details: ", error);
  }
  if(null != orderResponse) {
    orderResponse = orderResponse.body;
  }
  return orderResponse;
}

const updateCartbyPaymentId = async(cart, visaCheckoutData) => {
  let orderResponse: any;
  try {
    const client = getClient();
    if(null != client) {
      const requestBuilder = createRequestBuilder({ projectKey: process.env.PROJECT_KEY });
      const uri = requestBuilder.carts
      .byId(cart.id)
      .build();
      const channelsRequest = {
        uri: uri,
        method: 'POST',
        body: JSON.stringify({
          version: cart.version,
          actions: [
            { 
                action : "setBillingAddress",
                address : {
                  firstName : visaCheckoutData.billToFieldGroup.firstName,
                  lastName : visaCheckoutData.billToFieldGroup.lastName,
                  streetName : visaCheckoutData.billToFieldGroup.address1,
                  streetNumber : visaCheckoutData.billToFieldGroup.address2,
                  postalCode : visaCheckoutData.billToFieldGroup.postalCode,
                  city : visaCheckoutData.billToFieldGroup.locality,
                  region : visaCheckoutData.billToFieldGroup.administrativeArea,
                  country : visaCheckoutData.billToFieldGroup.country,
                  phone : visaCheckoutData.billToFieldGroup.phoneNumber,
                  email : visaCheckoutData.billToFieldGroup.email    
                }
            }
          ]
        })
      };
      orderResponse = await client.execute(channelsRequest);
    }
    else {
      console.log("Couldnt't connect to Commercetools");
    }
  }
  catch(error) {
    console.log("Exception during fetching order details: ", error);
  }
  if(null != orderResponse) {
    orderResponse = orderResponse.body;
  }
  return orderResponse;
}

export default { retrieveCartByAnonymousId, retrieveCartByCustomerId, retrieveCartByPaymentId, retrievePayment, addTransaction, getorders, updateCartbyPaymentId }