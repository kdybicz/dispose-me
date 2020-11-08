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

  // eslint-disable-next-line max-len
  const sentAfter = event.queryStringParameters.sentAfter ? decodeURIComponent(event.queryStringParameters.sentAfter) : null;

  let response;
  switch (event.path) {
    case '/email/latest':
      console.log('Getting latest email for user', username);

      response = await controller.latestEmail(normalizedUsername, sentAfter);
      break;
    case '/email':
      console.log('Getting list of emails for user', username);

      const emails = await controller.listEmails(normalizedUsername, sentAfter, 10);

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
