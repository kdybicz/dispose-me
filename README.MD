# Dispose Me

Dispose Me is a simple AWS-hosted disposable email service.


## TL;DR

1. Own an Route53-manageable domain with a SSL certificate in a Region supporting SES incoming emails.
2. Create project-dedicated AWS user for project deployment (optional).
3. Download the code, create and fill out `.env` file - based on an `.env.example`.
4. Run `yarn deploy production` to install dependencies, run tests and deploy code.
5. Verify domain and setup catch-all Rule Set in the Simple Email Service, incl. actions setup:
   1. S3 with your email bucket
   2. Lambda `dispose-me-${stage}-processor`
6. Have fun!


## Tech Stack

### Frameworks
- [Node.js](https://github.com/nodejs/node)
- [express.js](https://github.com/expressjs/express)
- [EJS](https://github.com/mde/ejs)
- [Serverless](https://github.com/serverless/serverless)
  - [Serverless Offline](https://github.com/dherault/serverless-offline)
- [webpack](https://github.com/webpack/webpack)

### AWS Services
- Api Gateway
- CloudFormation
- Lambda
  - with custom Authorizer
- Route53
- Simple Email Service
- Simple Storage Service


## Setup process

### Environment

First step of the preparation process should be making sure you have
[Node.js installed](https://nodejs.org/en/download/package-manager/) in a
version v12.x or above.

You can easily verify which Node version is installed by running:
```
$ node -v
v12.19.0
```


### Getting the project

Download the project source code using `git`:
```
$ git clone https://github.com/kdybicz/dispose-me.git
```
or as a `zip` file from https://github.com/kdybicz/dispose-me/archive/master.zip
and unpack it into a folder of your choosing.

Next run `yarn` to install all required dependencies:

```
$ cd dispose-me
$ yarn
```

Optionally run the test to ensure, that the code is running properly:

```
$ yarn test
```


### AWS user

**Note:** Next steps assume you already have an AWS account and you're logged in into the AWS Console!

It's generally a good practice to use dedicated user for each project you're running on AWS.
In that way you're able to more easily control which projects use what permissions.

I recommend you to create new user with Programmatic access only, by going to https://console.aws.amazon.com/iam/home?#/users$new?step=details
Select _Attach existing policies directly_ in the _Set permissions_ section and be sure to check all of bellow policies:

- AmazonAPIGatewayAdministrator
- AmazonRoute53FullAccess
- AWSCertificateManagerFullAccess
- AWSCloudFormationFullAccess
- AWSLambdaFullAccess
- IAMFullAccess

**Note:** I the last step of the process of creating new user you would be presented with a user credentials. Be sure to copy those credentials and store them in `.env` file inside of the project folder. Please use `.env.example` as a reference.


### Setup a Domain

To setup Simple Email Service you need to own an domain associated with your AWS account. This means you will need to use Route53 to:

- buy a domain: https://console.aws.amazon.com/route53/home#DomainRegistration:
- or transfer a domain: https://console.aws.amazon.com/route53/home#DomainTransfer:

Either way keep in mind that this process can take some time (~40 min).

**Note**: Domains doesn't come free, so be sure to choose one not only cheap to buy, but also to maintain, like: `.de` or `.uk`. For domain prices refer to _Domain Names_ in https://aws.amazon.com/route53/pricing/


### Choose the Region

Select one of Regions that supports Receiving emails with SES:
https://docs.aws.amazon.com/ses/latest/DeveloperGuide/regions.html#region-receive-email

**Note:** This is a really important phase, as this Region will need to be used in the next steps and also while
deploying the code. I will refer to it as the **Region** in the following parts of the documentation.


#### Change your Region

Be sure to change your **Region** now, to the one selected in a previous step.


### SSL Certificate

**Note:** Verify you're in the right **Region**!

Then go to _AWS > Certificate Manager_ and _Request a public certificate_. You can choose a wildcard certificate
(like: `*.example.com`) if you plan to deploy other services under the same domain name. If not, then you can
select only the one subdomain under which you want the service interface be available on.

**Note:** Again keep in mind that this process can take some time.


### Deploy

Now it would be good time to refer to `.env.example` and create `.env` file. User comments inside as a reference.
When done you should be able to deploy the code to AWS by running:

```
$ yarn deploy production
```

Keep and eye on API access tokens that would be generated while deployment.

**Note:** In case of any issues please raise an Issue with description including steps taken and error message.


### Simple Email Service

**Note:** Verify you're in the right **Region**!

#### Verify your domain

You need to verify in SES the domain as yours. To do so go to _AWS > Simple Email Service_ and select _Verify a New Domain_ from the _Domains (Identity Management)_ section.

**Note:** Again this process can also take some time.

#### Gotta Catch 'Em All!

When domain is verified you need to create a Catch-All Rule that will save all incoming email in a dedicated S3 bucket and trigger the `dispose-me-production-processor` Lambda.

Go to _AWS > Simple Email Service_ and choose the _Create a New Rule Set_ from the _Rule Set (Email Receiving)_ section. For actions setup select:
1. S3 with the `EMAIL_BUCKET_NAME`
2. Lambda with `dispose-me-production-processor`

**Note:** If the Email Receiving section is grayed out it means that you're not in a **Region** where SES is supporting Email Receiving!


### Time for tests

Go to: https://INTERFACE_SUBDOMAIN/?x-api-key=ACCESS_TOKEN

**Note:** You can also send the `ACCESS_TOKEN` in the `x-api-key` request Header.


## Opening to public

Some of you may want to open the service to public. At first glance this seems
to be a great idea, but you should be aware that there is a real risk involved
in doing that. You should be really sure that you know what you are doing!
I'm not an security expert nor the right person to give you any advice on this
topic, though I can share some suggestion left by @shokinn.


### The Suggestion

There are some email addresses that have more power than others, just like an
administrator account on your local machine is more powerful than a regular
user. It's pretty important that you don't open those addresses to public,
because you can miss some warning, notice or adminstration messages being sent
to you or even loose the domain, just because someone was be able to
impersonate himself as its owner, by being able to read and act upon emails
sent to some of those inboxes.

Here is a list of such inbox names, also "restricted" in some of the
[Google Services](https://support.google.com/a/answer/6093413?hl=en). It seems
to be based on an old [RFC 2142](https://www.ietf.org/rfc/rfc2142.txt) with
some new additions.


### Setting it up

The bare minimum you need to do to open the service to public is just to copy
and uncomment two lines of code from the `.env.example`:

```
PRIVATE_ACCESS=false

INBOX_BLACKLIST=hostmaster,postmaster,webmaster,admin,administrator,abuse,root,ssl-admin,majordomo
```

**Note:** I really encourage you to not ignore the importance of `INBOX_BLACKLIST`.

Now just redeploy the service and voilà.


### Beyond the bare minimum

A step past the bare minimum, would be to ensure that anything sent to any of
the power emails in question would never be processed by Lambda. Then even
if someone would find a way to bypass the blacklist, would not found any emails
in those inboxes.

Unfortunately, so far I didn't managed to find an easy way of setting this
part up automatically, so you will need to do it manually. Please go back
to _AWS > Simple Email Service_ and choose the _View Active Rule Set_ from the
_Rule Set (Email Receiving)_ section. Then hit _Create Rule_. In the
_Step 1: Recipients_ add all email addresses following the scheme:
* hostmaster@`INTERFACE_SUBDOMAIN`
* postmaster@`INTERFACE_SUBDOMAIN`
* webmaster@`INTERFACE_SUBDOMAIN`
* admin@`INTERFACE_SUBDOMAIN`
* administrator@`INTERFACE_SUBDOMAIN`
* abuse@`INTERFACE_SUBDOMAIN`
* root@`INTERFACE_SUBDOMAIN`
* ssl-admin@`INTERFACE_SUBDOMAIN`
* majordomo@`INTERFACE_SUBDOMAIN`

Where the `INTERFACE_SUBDOMAIN` is the name of your domain.

When you hit _Next Step_ button you will go to _Actions_ page. Select
_Stop Rule Set_ to prevent previously entered emails from being processed.
You can also setup an SNS topic which will be notified about any email
that was sent for any of those blocked addresses. I would recommend setting
that up. Here you can find [more details](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/receiving-email-action-stop.html).

On _Rule Details_ screen be sure to set _Insert after rule_ to _\<Beginning\>_ and you're good to go.

**Note:** Be sure to double check that newly created rule is first on the list!


## Costs simulation

> This is just an example of a potential costs breakdown. Keep in mind that it's just an estimate,
not verified by real world long term usage, so it could be way different in your individual case - please **BE WARNED**.

- `.de` domain: $9.00 per year
- Hosted Zones and Records: $0.50 per hosted zone / month
- Public SSL Certificate: _"Public SSL/TLS certificates provisioned through AWS Certificate Manager are free. You pay only for the AWS resources you create to run your application."_
- Simple Email Service:
  - Free Tier: $0 for the first 1,000 emails you receive, and $0.10 for every 1,000 emails you receive after that.
  - Later: $0.09 for every 1,000 incoming email chunks (see [Pricing details](https://aws.amazon.com/ses/pricing/#Pricing_details) for more information).
- Simple Storage Service:
  - Storage: First 50 TB / Month - $0.023 per GB
  - Requests & data retrievals:
    - PUT, COPY, POST, LIST requests (per 1,000 requests): $0.005
    - GET, SELECT, and all other requests (per 1,000 requests): $0.0004
  - Data Transfer: Up to 1 GB / Month - $0.00 per GB
- Lambda 512MB: $0.0000008333 per 100ms

Small scale usage on a Free Tier:
- domain + hosted zone: $9.00 per year + $0.25 * 12 months = $12.0 per year
- incoming emails (1.000 emails per month): (12 - 1) * $0.10 = $1.10
- avg. 300 ms Lambda time to process a email: 12.000 emails * (300 ms / 100 ms) * $0.0000008333 = $0.03
- avg. 300 ms API Lambda time per request, assume 5x more requests than emails: $0.03 * 5 = $0.15
- S3 operations assuming plain text/html emails, assuming 84.000 requests: 84.000 / 1.000 * $0.005 = $0.42
- anything else?

Total: ~$15.00 + TAX per year
