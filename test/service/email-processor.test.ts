import type { Context, SESEvent } from 'aws-lambda';

import { handler } from '../../service/email-processor';
import { MockedIncomingEmailProcessor } from '../utils';

jest.mock('../../service/processor/IncomingEmailProcessor');

describe('email-processor', () => {
  const messageId = 'message-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handle event', async () => {
    // given
    const event = {
      Records: [{ ses: { mail: { messageId } } }],
    } as SESEvent;

    // when
    await handler(event, {} as unknown as Context, () => {});
    // then
    expect(MockedIncomingEmailProcessor.mockProcessEmail).toHaveBeenCalledWith(messageId);
  });
});
