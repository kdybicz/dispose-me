import { S3 } from '@aws-sdk/client-s3';
import type {
  CopyObjectRequest,
  DeleteObjectRequest,
  GetObjectCommandOutput,
  GetObjectRequest,
  ListObjectsV2CommandOutput,
  ListObjectsV2Request,
} from '@aws-sdk/client-s3';

import log from './log';

export class S3FileSystem {
  protected client: S3;

  constructor(region?: string) {
    this.client = new S3({
      apiVersion: '2006-03-01',
      region: region ?? process.env.AWS_REGION,
    });
  }

  async getObject(bucket: string, filePath: string): Promise<GetObjectCommandOutput> {
    const getRequest: GetObjectRequest = {
      Bucket: bucket,
      Key: filePath,
    };

    log.debug('Getting Object:', JSON.stringify(getRequest, null, 2));

    return this.client.getObject(getRequest);
  }

  async getObjects(bucket: string, filePaths: string[]): Promise<GetObjectCommandOutput[]> {
    return Promise.all(filePaths.map((filePath) => this.getObject(bucket, filePath)));
  }

  async copyObject(bucket: string, sourcePath: string, destinationPath: string): Promise<void> {
    const copyRequest: CopyObjectRequest = {
      CopySource: `${bucket}/${sourcePath}`,
      Bucket: bucket,
      Key: destinationPath,
    };

    log.debug('Copying Object:', JSON.stringify(copyRequest, null, 2));

    await this.client.copyObject(copyRequest);
  }

  async deleteObject(bucket: string, filePath: string): Promise<void> {
    const deleteRequest: DeleteObjectRequest = {
      Bucket: bucket,
      Key: filePath,
    };

    log.debug('Deleting Object:', JSON.stringify(deleteRequest, null, 2));

    await this.client.deleteObject(deleteRequest);
  }

  async moveObject(bucket: string, sourcePath: string, destinationPath: string): Promise<void> {
    await this.copyObject(bucket, sourcePath, destinationPath);
    await this.deleteObject(bucket, sourcePath);
  }

  async listObjects(bucket: string, path: string, limit = 10): Promise<ListObjectsV2CommandOutput> {
    const listRequest: ListObjectsV2Request = {
      Bucket: bucket,
      MaxKeys: limit,
      Delimiter: '/',
      Prefix: `${path}/`,
    };

    log.debug('Listing Objects:', JSON.stringify(listRequest, null, 2));

    return this.client.listObjectsV2(listRequest);
  }
}
