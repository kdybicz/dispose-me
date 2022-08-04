/* eslint-disable no-case-declarations */
/* eslint-disable no-console */
import { APIGatewayProxyHandler } from 'aws-lambda';

import { ApiController } from './controllers/ApiController';
import { normalizeUsername } from './tools/utils';

import 'source-map-support/register';

const controller = new ApiController(process.env.BUCKET_NAME);

export const handler: APIGatewayProxyHandler = async (event) => {
  console.debug('Processing API call:', JSON.stringify(event, null, 2));

  const username = decodeURIComponent(event.queryStringParameters.username);
  const normalizedUsername = normalizeUsername(username);

  let response;
  switch (event.path) {
    case '/email/latest':
      console.log('Getting latest email for user', username);

      response = await controller.latestEmail(normalizedUsername);
      break;
    case '/email':
      console.log('Getting list of emails for user', username);

      // eslint-disable-next-line max-len
      const startAfter = event.queryStringParameters.startAfter ? decodeURIComponent(event.queryStringParameters.startAfter) : null;

      const emails = await controller.listEmails(normalizedUsername, startAfter, 50);

      response = { emails };
      break;
    default:
      response = {
        message: 'Go Serverless Webpack (Typescript) v1.0! Your function executed successfully!',
        input: event,
      };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(response, null, 2),
  };
};
