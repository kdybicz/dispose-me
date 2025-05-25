import type { Context, SESEvent } from 'aws-lambda';

import { handler } from '../../service/email-processor';
import { MockedIncomingEmailProcessor, MESSAGE_ID } from '../utils';

jest.mock('../../service/processor/IncomingEmailProcessor');

describe('email-processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handle event', async () => {
    // given
    const event = {
      Records: [{ ses: { mail: { messageId: MESSAGE_ID } } }],
    } as SESEvent;

    // when
    await handler(event, {} as unknown as Context, () => {});
    // then
    expect(MockedIncomingEmailProcessor.mockProcessEmail).toHaveBeenCalledWith(MESSAGE_ID);
  });
});
