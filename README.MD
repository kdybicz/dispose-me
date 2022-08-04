# Dispose Me

Dispose Me is a simple disposable self-hosted email service.

## Setup process

### Create User

Create new user with Programmatic access and _Set permissions_:

- AmazonAPIGatewayAdministrator
- AmazonRoute53FullAccess
- AWSCertificateManagerFullAccess
- AWSCloudFormationFullAccess
- AWSLambdaFullAccess
- IAMFullAccess

ie. by using `Attach existing policies directly`.

I the last step of that process you would be presented with user credentials. Copy those credentials and store them in `.env` file inside of the project folder. Please use `.env.example` as a reference.


### Setup a Domain
   
You can use Route53:

- to buy a domain: https://console.aws.amazon.com/route53/home#DomainRegistration:
- or to transfer a domain: https://console.aws.amazon.com/route53/home#DomainTransfer:

Either way keep in mind that this process can take some time.


### Choose Region

Select one of Regions that supports Receiving emails with SES:

https://docs.aws.amazon.com/ses/latest/DeveloperGuide/regions.html#region-receive-email

**Note:** This is important step, as this region will be used in following steps and while deploying the code. I will refer to it as the **Region**.


#### Change your Region

Be sure to change your **Region** to one chosen in a previous step.


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