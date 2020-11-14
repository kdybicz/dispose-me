# Dispose Me

Dispose Me is a simple AWS-based self-hosted disposable email service.

## Tech Stack

### Framework used
- [Node.js](https://github.com/nodejs/node) v12.x
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

As a first step of configuration process I would recommend making sure you've already
[installed Node.js](https://nodejs.org/en/download/package-manager/) in a version v12.x or above.

You can verify that by checking Node version:
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

Next move into project folder and install the dependencies:

```
$ cd dispose-me
$ yarn
```

You can also run the tests to be sure, that the code is running properly, before you attempt to deploy it on AWS:

```
$ yarn test
```


### Create dedicated AWS user

It's generally a good practice to use dedicated user for each project you're running on AWS.
In that way you're able to more easily to track and restrict permissions to only required ones.

That's why in this step I would recommend you to create new user with Programmatic access only and _Set permissions_:

- AmazonAPIGatewayAdministrator
- AmazonRoute53FullAccess
- AWSCertificateManagerFullAccess
- AWSCloudFormationFullAccess
- AWSLambdaFullAccess
- IAMFullAccess

ie. by using `Attach existing policies directly`.

**Note:** I the last step of that process you would be presented with a user credentials. Copy those credentials and store them in `.env` file inside of the project folder. Please use `.env.example` as a reference.


### Setup a Domain
   
You would need to use Route53:

- to buy a domain: https://console.aws.amazon.com/route53/home#DomainRegistration:
- or to transfer a domain: https://console.aws.amazon.com/route53/home#DomainTransfer:

Either way keep in mind that this process can take some time (~40 min).


### Choose the right Region

Select one of Regions that supports Receiving emails with SES:

https://docs.aws.amazon.com/ses/latest/DeveloperGuide/regions.html#region-receive-email

**Note:** This is important phase, as this Region will be used in the following steps and also while deploying the code. I will refer to it as the **Region**.


#### Change your Region

Be sure to change your **Region** to the one chosen in a previous step.


### Buy a Certificate

**Note:** Verify you're in the right **Region**!

Then request a new Provision Certificate:

https://eu-west-1.console.aws.amazon.com/acm/home?region=eu-west-1#/privatewizard/ - link for Ireland (eu-west-1), yours may differ!

Again keep in mind that this process can take some time.


### Configure SES

**Note:** Verify you're in the right **Region**!

#### Verify your domain

Before proceeding you will need to verify the domain as yours:

Simple Email Service > Domains (Identity Management) > Verify a New Domain

https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-north-1#verified-senders-domain: - link for Ireland (eu-west-1), yours may differ!

This process can also take some time.

#### Create a New Rule Set

Now you would need to create a catch-all Rule that would save all incoming email in S3 and trigger the `dispose-me-${stage}-processor` Lambda:

Simple Email Service > Rule Set (Email Receiving) > Create a New Rule Set

https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1#receipt-rules: - link for Ireland (eu-west-1), yours may differ!

**Note:** If the Email Receiving section is grayed out it means that you're not in a **Region** where SES is supporting Email Receiving!


### TODO
* [x] Emails breakdown by email account name and named after a receiving timestamp
* [x] TTL on S3 items - set to 1 day
* [ ] CloudWatch log retention?
* [ ] Drop a log file next to email unsuccessfully processed?
* [ ] Include RSS?