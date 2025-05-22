import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { S3FileSystem } from "../../../service/tools/S3FileSystem";

describe("S3FileSystem tests", () => {
  const s3Client = mockClient(S3Client);

  beforeEach(() => {
    s3Client.reset();
  });

  test("getting the object from S3 bucket", async () => {
    // given
    const bucket = "bucket";
    const messageId = "id";
    // and
    let commandParams;
    s3Client.on(GetObjectCommand).callsFakeOnce((input) => {
      commandParams = input;
      return;
    });

    // when
    const filesystem = new S3FileSystem();
    await filesystem.getObject(bucket, messageId);
    // then
    expect(commandParams).toMatchObject({
      Bucket: bucket,
      Key: messageId,
    });
  });

  test("getting list of objects from S3 bucket", async () => {
    // given
    const bucket = "bucket";
    const messageId1 = "id1";
    const messageId2 = "id1";
    // and
    const commandParams: any[] = [];
    s3Client.on(GetObjectCommand).callsFake((input) => {
      commandParams.push(input);
      return;
    });

    // when
    const filesystem = new S3FileSystem();
    await filesystem.getObjects(bucket, [messageId1, messageId2]);
    // then
    expect(commandParams).toMatchObject([
      { Bucket: bucket, Key: messageId1 },
      { Bucket: bucket, Key: messageId2 },
    ]);
  });
});
