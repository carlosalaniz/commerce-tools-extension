import fetch from 'node-fetch';
import { createRequestBuilder } from '@commercetools/api-request-builder';
import { createAuthMiddlewareForClientCredentialsFlow } from '@commercetools/sdk-middleware-auth';
import { createHttpMiddleware } from '@commercetools/sdk-middleware-http';
import { createClient } from '@commercetools/sdk-client';

function getClient() {
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
  const client = createClient({
    middlewares: [
      authMiddleware,
      createHttpMiddleware({
        host: process.env.API_HOST,
        fetch,
      }),
    ],
  });
  return client;
}

const retrieveCartByAnonymousId = async(anonymousId): Promise<any> => {
  const client = getClient();
  const requestBuilder = createRequestBuilder({ projectKey: process.env.PROJECT_KEY });
  const uri = requestBuilder.carts
  .parse({ where: [`anonymousId = "${anonymousId}"`, `cartState="Active"`] })
  .build();
  const channelsRequest = {
    uri: uri,
    method: 'GET',
  }
  const anonymousIdResponse = await client.execute(channelsRequest);
  return anonymousIdResponse.body;
}

const retrieveCartByCustomerId = async(customerId): Promise<any> => {
  const client = getClient();
  const requestBuilder = createRequestBuilder({ projectKey: process.env.PROJECT_KEY });
  const uri = requestBuilder.carts
  .parse({ where: [`customerId = "${customerId}"`, `cartState="Active"`] })
  .build();
  const channelsRequest = {
    uri: uri,
    method: 'GET',
  };
  const customerIdResponse = await client.execute(channelsRequest);
  return customerIdResponse.body;
}

const retrieveCartByPaymentId = async(paymentId): Promise<any> => {
  const client = getClient();
  const requestBuilder = createRequestBuilder({ projectKey: process.env.PROJECT_KEY });
  const uri = requestBuilder.carts
  .parse({ where: [`paymentInfo(payments(id="${paymentId}"))`] })
  .build();
  const channelsRequest = {
    uri: uri,
    method: 'GET',
  };
  const paymentIdResponse = await client.execute(channelsRequest);
  return paymentIdResponse.body;
}

const retrievePayment = async(paymentId): Promise<any> => {
  const client = getClient();
  const requestBuilder = createRequestBuilder({ projectKey: process.env.PROJECT_KEY });
  const uri = requestBuilder.payments
  .byId(paymentId)
  .build();
  const channelsRequest = {
    uri: uri,
    method: 'GET',
  };
  const paymentResponse = await client.execute(channelsRequest);
  return paymentResponse.body;
}

const addTransaction = async(transactionObject): Promise<any> => {
  const client = getClient();
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
  const transactionResonse = await client.execute(channelsRequest);
  return transactionResonse.body;
}

const getorders = async() => {
  const client = getClient();
  const requestBuilder = createRequestBuilder({ projectKey: process.env.PROJECT_KEY });
  const uri = requestBuilder.payments
  .parse({ sort: [{by: "lastModifiedAt", direction: "desc"}]}).build();
  const channelsRequest = {
    uri: uri,
    method: 'GET',
  };
  const orderResponse = await client.execute(channelsRequest);
  return orderResponse.body;
}

const updateCartbyPaymentId = async(cart, visaCheckoutData) => {
    const client = getClient();
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
    const orderResponse = await client.execute(channelsRequest);
    return orderResponse.body;
}

export default { retrieveCartByAnonymousId, retrieveCartByCustomerId, retrieveCartByPaymentId, retrievePayment, addTransaction, getorders, updateCartbyPaymentId }