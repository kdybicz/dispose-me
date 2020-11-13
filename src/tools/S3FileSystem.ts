/* eslint-disable max-len */
/* eslint-disable no-console */

import { AWSError, S3 } from 'aws-sdk';
import {
  CopyObjectRequest, GetObjectRequest, DeleteObjectRequest, ListObjectsV2Request,
} from 'aws-sdk/clients/s3';
import { PromiseResult } from 'aws-sdk/lib/request';

export class S3FileSystem {
  protected client: S3;

  constructor(region: string = process.env.AWS_REGION) {
    this.client = new S3({
      apiVersion: '2006-03-01',
      region,
    });
  }

  // eslint-disable-next-line max-len
  async getObject(bucket: string, filePath: string): Promise<PromiseResult<S3.GetObjectOutput, AWSError>> {
    const getRequest: GetObjectRequest = {
      Bucket: bucket,
      Key: filePath,
    };

    console.debug('Getting Object:', JSON.stringify(getRequest, null, 2));
    return this.client.getObject(getRequest).promise();
  }

  async copyObject(bucket: string, sourcePath: string, destinationPath: string, expiredInMinutes: number): Promise<void> {
    const copyRequest: CopyObjectRequest = {
      CopySource: `${bucket}/${sourcePath}`,
      Bucket: bucket,
      Key: destinationPath,
    };

    if (expiredInMinutes) {
      copyRequest.Expires = new Date(new Date().getTime() + (expiredInMinutes * 60000));
    }

    console.debug('Copying Object:', JSON.stringify(copyRequest, null, 2));

    await this.client.copyObject(copyRequest).promise();
  }

  async deleteObject(bucket: string, filePath: string): Promise<void> {
    const deleteRequest: DeleteObjectRequest = {
      Bucket: bucket,
      Key: filePath,
    };
    console.debug('Deleting Object:', JSON.stringify(deleteRequest, null, 2));

    await this.client.deleteObject(deleteRequest).promise();
  }

  async moveObject(bucket: string, sourcePath: string, destinationPath: string, expiredInMinutes?: number): Promise<void> {
    await this.copyObject(bucket, sourcePath, destinationPath, expiredInMinutes);
    await this.deleteObject(bucket, sourcePath);
  }

  // eslint-disable-next-line max-len
  async listObjects(bucket: string, path: string, startAfter?: string, limit = 50): Promise<PromiseResult<S3.Types.ListObjectsV2Output, AWSError>> {
    const listRequest: ListObjectsV2Request = {
      Bucket: bucket,
      MaxKeys: limit,
      Delimiter: '/',
      Prefix: `${path}/`,
    };

    if (startAfter) {
      listRequest.StartAfter = startAfter;
    }

    console.debug('Listing Object:', JSON.stringify(listRequest, null, 2));

    return this.client.listObjectsV2(listRequest).promise();
  }
}
