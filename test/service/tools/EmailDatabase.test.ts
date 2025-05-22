import { mockClient } from "aws-sdk-client-mock";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { EmailDatabase } from "../../../service/tools/EmailDatabase";
import dayjs = require("dayjs");

describe("EmailDatabase tests", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
  });

  test("successfully store email metadata", async () => {
    // given
    const messageId = "id";
    const username = "username";
    const sender = "sender";
    const subject = "subject";
    const received = new Date("2024-01-01 01:01:01");
    // and
    let commandParams;
    ddbMock.on(PutCommand).callsFakeOnce((input) => {
      commandParams = input;
      return;
    });

    // when
    const db = new EmailDatabase();
    await db.store(messageId, username, sender, subject, received);
    // then
    expect(commandParams).toMatchObject({
      Item: {
        ExpireAt: dayjs(received).add(1, "day").unix(),
        Id: messageId,
        ReceivedAt: dayjs(received).unix(),
        Sender: sender,
        Subject: subject,
        Username: username,
      },
    });
  });

  test("list email metadata for a user", async () => {
    // given
    const username = "username";
    const defaultLimit = 10;
    // and
    let commandParams;
    ddbMock.on(QueryCommand).callsFakeOnce((input) => {
      commandParams = input;
      return;
    });

    // when
    const db = new EmailDatabase();
    await db.list(username);
    // then
    expect(commandParams).toMatchObject({
      ExpressionAttributeValues: {
        ":username": username,
      },
      IndexName: "Username-ReceivedAt-index",
      KeyConditionExpression:
        "Username = :username",
      Limit: defaultLimit,
      ScanIndexForward: false,
    });
  });

  test("list email metadata for a username, sent after and with limit", async () => {
    // given
    const username = "username";
    const sentAfter = dayjs().unix();
    const limit = 15;
    // and
    let commandParams;
    ddbMock.on(QueryCommand).callsFakeOnce((input) => {
      commandParams = input;
      return;
    });

    // when
    const db = new EmailDatabase();
    await db.list(username, sentAfter, limit);
    // then
    expect(commandParams).toMatchObject({
      ExpressionAttributeValues: {
        ":sentAfter": sentAfter,
        ":username": username,
      },
      IndexName: "Username-ReceivedAt-index",
      KeyConditionExpression:
        "Username = :username AND ReceivedAt > :sentAfter",
      Limit: limit,
      ScanIndexForward: false,
    });
  });

  test.each([
    [null, false],
    [0, false],
    [1, true],
  ])("check if email metadata exists for a username and message id", async (count, expectedResult) => {
    // given
    const messageId = "id";
    const username = "username";
    // and
    let commandParams;
    ddbMock.on(QueryCommand).callsFakeOnce((input) => {
      commandParams = input;
      return { Count: count };
    });

    // when
    const db = new EmailDatabase();
    const result = await db.exists(username, messageId);
    // then
    expect(result).toEqual(expectedResult);
    // and
    expect(commandParams).toMatchObject({
      KeyConditionExpression: 'Username = :username AND Id = :messageId',
      ExpressionAttributeValues: {
        ':messageId': messageId,
        ':username': username,
      },
      ProjectionExpression: 'Id',
      Limit: 1,
    });
  });

  test.each([
    [null, false],
    [{ Id: 'id' }, true],
  ])("delete an email metadata for a username and message id", async (attributes, expectedResult) => {
    // given
    const messageId = "id";
    const username = "username";
    // and
    let commandParams;
    ddbMock.on(DeleteCommand).callsFakeOnce((input) => {
      commandParams = input;
      return { Attributes: attributes };
    });

    // when
    const db = new EmailDatabase();
    const result = await db.delete(username, messageId);
    // then
    expect(result).toEqual(expectedResult);
    // and
    expect(commandParams).toMatchObject({
      Key: {
        Username: username,
        Id: messageId,
      },
      ReturnValues: 'ALL_OLD',
    });
  });
});
