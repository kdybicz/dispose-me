import { EmailDetails } from "../../../service/api/InboxController";
import { mapEmailDetailsToFeedItem } from "../../../service/tools/feed";

describe("feed tests", () => {
  describe("mapEmailDetailsToFeedItem", () => {
    test("map email details to feed item", () => {
      // given
      const date = new Date();
      const email: EmailDetails = {
        id: "id",
        from: [{ address: "john.doe@example.com", user: "john.doe" }],
        to: [{ address: "jane.doe@example.com", user: "jane.doe" }],
        cc: [{ address: "maria.doe@example.com", user: "maria.doe" }],
        bcc: [{ address: "hidden@example.com", user: "hidden" }],
        subject: "subject",
        body: "body",
        received: date,
      };
      const username = "username";
      const token = "token";

      // when
      const result = mapEmailDetailsToFeedItem(email, username, token);
      // then
      expect(result).toEqual({
        author: [
          {
            email: "john.doe@example.com",
            name: "john.doe",
          },
        ],
        contributor: [
          {
            email: "jane.doe@example.com",
            name: "jane.doe"
          },
          {
            email: "maria.doe@example.com",
            name: "maria.doe",
          },
          {
            email: "hidden@example.com",
            name: "hidden",
          },
        ],
        content: "body",
        date: date,
        id: "id",
        link: "https://example.com/inbox/username/id?x-api-key=token",
        title: "subject",
      });
    });
  });
});
