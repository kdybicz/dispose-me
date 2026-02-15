import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  type QueryCommandOutput,
} from '@aws-sdk/lib-dynamodb';

import dayjs = require('dayjs');

import { getEmailTtlDays } from './config';
import { DEFAULT_EMAIL_LIMIT, TABLE_NAME } from './const';
import log from './log';

export class EmailDatabase {
  protected docClient: DynamoDBDocumentClient;

  constructor(region?: string) {
    const client = new DynamoDBClient({
      region: region ?? process.env.AWS_REGION,
    });
    this.docClient = DynamoDBDocumentClient.from(client);
  }

  async store(
    messageId: string,
    username: string,
    sender: string,
    subject: string,
    received: Date,
    hasAttachments: boolean,
  ): Promise<void> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        Id: messageId,
        Username: username,
        Sender: sender,
        Subject: subject,
        ReceivedAt: dayjs(received).unix(),
        ExpireAt: dayjs(received).add(getEmailTtlDays(), 'day').unix(),
        HasAttachments: hasAttachments,
      },
    });

    log.debug('Store Message details:', JSON.stringify(command.input));

    await this.docClient.send(command);
  }

  async list(
    username: string,
    sentAfter?: number,
    limit = DEFAULT_EMAIL_LIMIT,
  ): Promise<QueryCommandOutput> {
    let filterExpression = 'Username = :username';
    const expressionAttributeValues = {
      ':username': username,
    };
    if (sentAfter) {
      filterExpression = `${'Username = :username'} AND ReceivedAt > :sentAfter`;
      expressionAttributeValues[':sentAfter'] = sentAfter;
    }

    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'Username-ReceivedAt-index',
      KeyConditionExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: false, // DESC order, newest first
      Limit: limit,
    });

    log.debug('Listing Message details:', JSON.stringify(command.input));

    return this.docClient.send(command);
  }

  async exists(username: string, messageId: string): Promise<boolean> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'Username = :username AND Id = :messageId',
      ExpressionAttributeValues: {
        ':messageId': messageId,
        ':username': username,
      },
      ProjectionExpression: 'Id', // Only fetch Id (or any minimal attribute)
      Limit: 1,
    });

    log.debug('Does Message exists:', JSON.stringify(command.input));

    const result = await this.docClient.send(command);
    return (result.Count ?? 0) > 0;
  }

  async delete(username: string, messageId: string): Promise<boolean> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        Username: username,
        Id: messageId,
      },
      ReturnValues: 'ALL_OLD',
    });

    log.debug('Deleting Message:', JSON.stringify(command.input));

    const result = await this.docClient.send(command);
    return result.Attributes != null;
  }
}
