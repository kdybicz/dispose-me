import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { ParsedEmail } from './EmailParser';

export class EmailSender {
  protected sesClient;

  constructor(region?: string) {
    this.sesClient = new SESClient({
      region: region ?? process.env.AWS_REGION,
    });
  }

  createSendEmailCommand = (toAddress: string, fromAddress: string, email: ParsedEmail) => {
    return new SendEmailCommand({
      Destination: {
        ToAddresses: [toAddress],
      },
      Source: email.to[0].address,
      ReplyToAddresses: [fromAddress],
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: email.body,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: `Fwd: ${email.subject}`,
        },
      },
    });
  };

  send = async (email: ParsedEmail) => {
    const sendEmailCommand = this.createSendEmailCommand(
      'example@mailinator.com',
      'no-reply@disposeme.de',
      email,
    );

    try {
      return await this.sesClient.send(sendEmailCommand);
    } catch (caught) {
      if (caught instanceof Error && caught.name === 'MessageRejected') {
        const messageRejectedError = caught;
        return messageRejectedError;
      }
      throw caught;
    }
  };
}
