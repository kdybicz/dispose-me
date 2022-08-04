/* eslint-disable no-console */
import { APIGatewayRequestAuthorizerEvent, APIGatewayRequestAuthorizerHandler } from 'aws-lambda';

const getToken = (event: APIGatewayRequestAuthorizerEvent): string | null => {
  if (event.headers && event.headers['x-api-key']) {
    console.debug('Found token in Header');
    return event.headers['x-api-key'];
  }
  if (event.queryStringParameters && event.queryStringParameters['x-api-key']) {
    console.debug('Found token in Query parameters');
    return event.queryStringParameters['x-api-key'];
  }
  console.debug('Did not found token in Header nor Query parameters');
  return null;
};

export const handler: APIGatewayRequestAuthorizerHandler = (event, _, callback) => {
  callback(null, {
    principalId: 'x-api-key',
    usageIdentifierKey: getToken(event),
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: 'Allow',
        Resource: event.methodArn,
      }],
    },
  });
};
