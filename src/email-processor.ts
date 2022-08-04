import { S3EventRecord, S3Handler } from 'aws-lambda';
import 'source-map-support/register';
import { S3 } from 'aws-sdk';
import simpleParser from 'mailparser';

const s3 = new S3({
  apiVersion: '2006-03-01',
  region: 'eu-central-1' // process.env.AWSREGION,
});

export const handler: S3Handler = async (event, _context) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const record: S3EventRecord = event.Records[0];
    // Retrieve the email from your bucket
    const request = {
      Bucket: record.s3.bucket.name,
      Key: record.s3.object.key,
    };
  
    try {
      const data = await s3.getObject(request).promise();
      // console.log('Raw email:' + data.Body);
      const email = await simpleParser(data.Body);
      console.log('date:', email.date);
      console.log('subject:', email.subject);
      console.log('body:', email.text);
      console.log('from:', email.from.text);
      console.log('attachments:', email.attachments);
      return { status: 'success' };
    } catch (Error) {
      console.log(Error, Error.stack);
      return Error;
    }
}
