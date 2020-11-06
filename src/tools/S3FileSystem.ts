/* eslint-disable no-console */

import { AWSError, S3 } from 'aws-sdk';
import { CopyObjectRequest, GetObjectRequest, DeleteObjectRequest } from 'aws-sdk/clients/s3';
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

    console.log('Getting Object:', JSON.stringify(getRequest, null, 2));
    return this.client.getObject(getRequest).promise();
  }

  async copyObject(bucket: string, sourcePath: string, destinationPath: string): Promise<void> {
    const copyRequest: CopyObjectRequest = {
      CopySource: `${bucket}/${sourcePath}`,
      Bucket: bucket,
      Key: destinationPath,
    };
    console.log('Copying Object:', JSON.stringify(copyRequest, null, 2));

    await this.client.copyObject(copyRequest).promise();
  }

  async deleteObject(bucket: string, filePath: string): Promise<void> {
    const deleteRequest: DeleteObjectRequest = {
      Bucket: bucket,
      Key: filePath,
    };
    console.log('Deleting Object:', JSON.stringify(deleteRequest, null, 2));

    await this.client.deleteObject(deleteRequest).promise();
  }

  async moveObject(bucket: string, sourcePath: string, destinationPath: string): Promise<void> {
    await this.copyObject(bucket, sourcePath, destinationPath);
    await this.deleteObject(bucket, sourcePath);
  }
}
