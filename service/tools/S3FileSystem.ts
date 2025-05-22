import { GetObjectCommand, type GetObjectCommandOutput, S3Client } from '@aws-sdk/client-s3';

import log from './log';

export class S3FileSystem {
  protected client: S3Client;

  constructor(region?: string) {
    this.client = new S3Client({
      region: region ?? process.env.AWS_REGION,
    });
  }

  async getObject(bucket: string, filePath: string): Promise<GetObjectCommandOutput> {
    const getRequest = new GetObjectCommand({
      Bucket: bucket,
      Key: filePath,
    });

    log.debug(`Getting Object - cmd: ${JSON.stringify(getRequest)}`);

    return this.client.send(getRequest);
  }

  async getObjects(bucket: string, filePaths: string[]): Promise<GetObjectCommandOutput[]> {
    return Promise.all(filePaths.map((filePath) => this.getObject(bucket, filePath)));
  }
}
