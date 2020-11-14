# Dispose Me

Dispose Me is a simple AWS-based self-hosted disposable email service.

## Tech Stack

### Framework used
- [Node.js](https://github.com/nodejs/node)
- [express.js](https://github.com/expressjs/express)
- [EJS](https://github.com/mde/ejs)
- [Serverless](https://github.com/serverless/serverless)
  - [Serverless Offline](https://github.com/dherault/serverless-offline)
- [webpack](https://github.com/webpack/webpack)

### AWS Services used
- Api Gateway
- Lambda
  - with custom Authorizer
- Simple Storage Service
- Simple Email Service
- Route53

## Setup process

### Preparing environment

As a first step of configuration process I would recommend you making sure you've
[Node.js installed](https://nodejs.org/en/download/package-manager/) in a version v12.x or above.

You can easily check if Node is installed and it's version:
```
$ node -v
v12.19.0
```


### Downloading the project

Now go ahead and download the project source code:
- using `git`:
  ```
  $ git clone https://github.com/kdybicz/dispose-me.git
  ```
- or as a `zip` file from https://github.com/kdybicz/dispose-me/archive/master.zip
  and unpack it into a folder of your choosing.

Next move into project folder and install the let it install all required dependencies:

```
$ cd dispose-me
$ yarn
```

You can also run the test suite to be sure, that the code is running properly, before you attempt to deploy it on AWS:

```
$ yarn test
```


### Create dedicated AWS user

**Note:** Couple of the next steps assume you already have an AWS account and you're logged in into the AWS Console!

It's generally a good practice to use dedicated user for each project you're running on AWS.
In that way you're able to more easily track and restrict permissions to only required ones, for those particular projects.

That's why in this step I would recommend you to create new user with Programmatic access only, by going to https://console.aws.amazon.com/iam/home?#/users$new?step=details

The choose _Attach existing policies directly_ in the _Set permissions_ section and be sure to check all of bellow policies:

- AmazonAPIGatewayAdministrator
- AmazonRoute53FullAccess
- AWSCertificateManagerFullAccess
- AWSCloudFormationFullAccess
- AWSLambdaFullAccess
- IAMFullAccess

**Note:** I the last step of the process of creating new user you would be presented with a user credentials. Copy those credentials and store them in `.env` file inside of the project folder. Please use `.env.example` as a reference.


### Setup a Domain

To setup Simple Email Service you would need to own a domain associated with your AWS account. This means you would need to use Route53:

- to buy a domain: https://console.aws.amazon.com/route53/home#DomainRegistration:
- or to transfer a domain: https://console.aws.amazon.com/route53/home#DomainTransfer:

Either way keep in mind that this process can take some time (~40 min).

**Note**: Domains doesn't come free, so be sure to choose one cheap to by and maintain, like: `.de` or `.uk`. For domain prices check _Domain Names_ in https://aws.amazon.com/route53/pricing/


### The Right Region

Select one of Regions that supports Receiving emails with SES:

https://docs.aws.amazon.com/ses/latest/DeveloperGuide/regions.html#region-receive-email

**Note:** This is a really important phase, as this Region will need to be used in the next steps and also while deploying the code. I will refer to it as the **Region**.


#### Change your Region

Be sure to change your **Region** to the one chosen in a previous step.


### SSL Certificate

**Note:** Verify you're in the right **Region**!

Then go to _AWS > Certificate Manager_ and _Request a public certificate_. I recommend choosing a wildcard certificate (ie. `*.example.com`), as it would allow you to easily setup other services in the future under same domain without need of requesting a new certificates.

**Note:** Again keep in mind that this process can take some time.


### Simple Email Service

**Note:** Verify you're in the right **Region**!

#### Verify your domain

Now you will need to verify the domain in SES as yours. To do so go to _AWS > Simple Email Service_ and select _Verify a New Domain_ from the _Domains (Identity Management)_ section.

**Note:** This process can also take some time.

#### Gotta Catch 'Em All!

When domain is verified you would need to create a Catch-All Rule that would save all incoming email in a dedicated S3 bucket and trigger the `dispose-me-${stage}-processor` Lambda.

Go to _AWS > Simple Email Service_ and choose the _Create a New Rule Set_ from the _Rule Set (Email Receiving)_ section.

**Note:** If the Email Receiving section is grayed out it means that you're not in a **Region** where SES is supporting Email Receiving!

### Deploy

Now that all of the AWS services are configured, you should be able to deploy the code. Before you do that though, you need to be sure that all of the required environment variables are setup `.env` file:

- AWS user credentials
  ```
  AWS_ACCESS_KEY_ID=secret-key-id
  AWS_SECRET_ACCESS_KEY=secret-key
  ```
- Selected **Region**
  ```
  AWS_REGION=eu-west-1
  ```
- Unique name for the incoming email bucket
  ```
  EMAIL_BUCKET_NAME=dispose-me-email-bucket
  ```
- Domain to which emails should be sent and a subdomain under which web interface / API would be accessible. It should be the same subdomain of a domain that was bought in one of the first steps.
  ```
  EMAIL_DOMAIN=example.com
  INTERFACE_SUBDOMAIN=www.example.com
  ```

## Costs breakdown

This is just an example of a potential costs breakdown. Keep in mind that it could be different in your individual case, so please BE WARNED (prices doesn't include TAX):
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


### TODO
* [x] Emails breakdown by email account name and named after a receiving timestamp
* [x] TTL on S3 items - set to 1 day
* [ ] CloudWatch log retention?
* [ ] Drop a log file next to email unsuccessfully processed?
* [ ] Include RSS?