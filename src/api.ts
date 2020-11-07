/* eslint-disable no-console */
import { APIGatewayProxyHandler } from 'aws-lambda';

import 'source-map-support/register';
import { S3FileSystem } from './tools/S3FileSystem';
import { normalizeUsername } from './tools/utils';

const fileSystem = new S3FileSystem();

const { BUCKET_NAME } = process.env;

export const handler: APIGatewayProxyHandler = async (event) => {
  console.debug('Processing API call:', JSON.stringify(event, null, 2));

  if (event.queryStringParameters.username) {
    const username = decodeURIComponent(event.queryStringParameters.username);
    const normalizedUsername = normalizeUsername(username);

    console.log(`${event.queryStringParameters.username}\n${username}\n${normalizedUsername}`);

    const emails = await fileSystem.listObjects(BUCKET_NAME, normalizedUsername);

    console.log('Listed Objects:', JSON.stringify(emails, null, 3));

    const names = emails.Contents.map((item) => item.Key);

    return {
      statusCode: 200,
      body: JSON.stringify({
        fileNames: names,
      }, null, 2),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless Webpack (Typescript) v1.0! Your function executed successfully!',
      input: event,
    }, null, 2),
  };
};
