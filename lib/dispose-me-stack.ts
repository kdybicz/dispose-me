import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cm from 'aws-cdk-lib/aws-certificatemanager';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as ses_actions from 'aws-cdk-lib/aws-ses-actions';
import * as cr from 'aws-cdk-lib/custom-resources';
import type { Construct } from 'constructs';
import * as dotenv from 'dotenv';

import { GetApiKey } from './constructs/get-api-key';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export class DisposeMeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainName = process.env.DOMAIN_NAME ?? '';
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName,
    });

    const emailBucket = this.setupEmailBucket(domainName);
    const emailTable = this.setupDatabase();
    this.setupApiGateway(domainName, hostedZone, emailBucket, emailTable);
    this.setupEmailProcessing(domainName, hostedZone, emailBucket, emailTable);
  }

  private setupEmailBucket = (domainName: string): s3.IBucket => {
    return new s3.Bucket(this, 'EmailBucket', {
      bucketName: domainName,
      lifecycleRules: [
        {
          id: 'CleanUpRule',
          enabled: true,
          expiration: cdk.Duration.days(1),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  };

  private setupDatabase = (): dynamodb.ITableV2 => {
    const emailTable = new dynamodb.TableV2(this, 'EmailTable', {
      tableName: 'dispose-me',
      partitionKey: {
        name: 'Username',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'Id',
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: 'ExpireAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    emailTable.addGlobalSecondaryIndex({
      indexName: 'Username-ReceivedAt-index',
      partitionKey: {
        name: 'Username',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'ReceivedAt',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    return emailTable;
  };

  private setupApiGateway = (
    domainName: string,
    hostedZone: route53.IHostedZone,
    emailBucket: s3.IBucket,
    emailTable: dynamodb.ITableV2,
  ): void => {
    // Define Lambda function
    const apiLambdaHandler = new nodejs.NodejsFunction(this, 'ApiLambda', {
      functionName: 'dispose-me-api',
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.AssetCode.fromAsset('dist/api.zip'),
      handler: 'index.handler',
      environment: {
        APP_VERSION: process.env.APP_VERSION ?? 'local-dev',
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        EMAIL_BUCKET_NAME: process.env.DOMAIN_NAME ?? '',
        DOMAIN_NAME: process.env.DOMAIN_NAME ?? '',
        INBOX_BLACKLIST: process.env.INBOX_BLACKLIST ?? '',
        LOG_LEVEL: '5',
        PRIVATE_ACCESS: process.env.PRIVATE_ACCESS ?? 'true',
        COOKIE_TTL_DAYS: process.env.COOKIE_TTL_DAYS ?? '30',
      },
      memorySize: 512,
      timeout: cdk.Duration.seconds(3),
      logGroup: new LogGroup(this, 'ApiLambdaLogGroup', {
        logGroupName: '/aws/lambda/dispose-me-api',
        retention: RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });
    emailBucket.grantReadWrite(apiLambdaHandler);
    emailTable.grantReadWriteData(apiLambdaHandler);

    // Define the API Gateway resource
    const certificate = this.setupCertificate(hostedZone, domainName);
    const api = new apigateway.LambdaRestApi(this, 'ApiGateway', {
      restApiName: 'dispose-me-api',
      apiKeySourceType: apigateway.ApiKeySourceType.AUTHORIZER,
      deployOptions: {
        stageName: 'production',
      },
      domainName: {
        domainName,
        certificate,
      },
      handler: apiLambdaHandler,
      minCompressionSize: cdk.Size.bytes(1024),
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      proxy: false,
      binaryMediaTypes: ['*/*'],
    });
    // Removing the default output for the API Endpoint
    api.node.tryRemoveChild('Endpoint');

    if (!process.env.CI) {
      // add our own output
      new cdk.CfnOutput(this, 'ApiGatewayEndpoint', { value: api.url });
    }

    // Create API Authorizer
    const apiAuthorizer = this.setupApiAuthorizer();
    const privateAccess = process.env.PRIVATE_ACCESS !== 'false';

    // Determine CORS origins based on environment
    const allowOrigins = process.env.LOCAL_DEV_STACK ? ['*'] : [`https://${domainName}`];
    const allowHeaders = ['Content-Type', 'X-Api-Key', 'Authorization'];

    // Define the '/' resource with a GET method
    const rootResource = api.root;
    rootResource.addCorsPreflight({
      allowOrigins,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders,
    });
    rootResource.addMethod('GET');
    rootResource.addMethod('POST');

    // Define the '/logout' resource with a GET method
    const logoutResource = api.root.addResource('logout');
    logoutResource.addCorsPreflight({
      allowOrigins,
      allowMethods: ['GET', 'OPTIONS'],
      allowHeaders,
    });
    logoutResource.addMethod('GET');

    // Define the '/*' resource with a GET method
    const proxyResource = api.root.addResource('{proxy+}');
    proxyResource.addCorsPreflight({
      allowOrigins,
      allowMethods: ['GET', 'DELETE', 'OPTIONS'],
      allowHeaders,
    });
    proxyResource.addMethod('GET', undefined, {
      apiKeyRequired: privateAccess,
      authorizer: apiAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    proxyResource.addMethod('DELETE', undefined, {
      apiKeyRequired: privateAccess,
      authorizer: apiAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Point domain to the API Gateway
    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api)),
    });

    // Usage Plan and API Keys
    const plan = api.addUsagePlan('ApiUsagePlan', {
      name: 'dispose-me-api',
      throttle: {
        rateLimit: 3,
        burstLimit: 5,
      },
      quota: {
        limit: 5000,
        period: apigateway.Period.DAY,
      },
    });
    plan.addApiStage({
      stage: api.deploymentStage,
    });

    const apiAccessKey = new apigateway.ApiKey(this, 'ApiKey', {
      apiKeyName: 'Access key',
      stages: [api.deploymentStage],
    });
    plan.addApiKey(apiAccessKey);

    const getApiAccessKeyWithValue = new GetApiKey(this, 'GetApiKey', {
      apiKey: apiAccessKey,
    });

    if (!process.env.CI) {
      new cdk.CfnOutput(this, 'ApiKeyValue', {
        value: getApiAccessKeyWithValue.value,
      });
    }
  };

  private setupCertificate = (
    hostedZone: route53.IHostedZone,
    domainName: string,
  ): cm.ICertificate => {
    const certificateValidation = cm.CertificateValidation.fromDns(hostedZone);
    const keyAlgorithm = cm.KeyAlgorithm.EC_SECP384R1;

    return new cm.Certificate(this, 'Certificate', {
      domainName,
      keyAlgorithm: keyAlgorithm,
      validation: certificateValidation,
    });
  };

  private setupApiAuthorizer = (): apigateway.IAuthorizer => {
    const authorizerLambdaHandler = new nodejs.NodejsFunction(this, 'AuthorizerLambda', {
      functionName: 'dispose-me-authorizer',
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.AssetCode.fromAsset('dist/authorizer.zip'),
      handler: 'index.handler',
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        LOG_LEVEL: '5',
      },
      memorySize: 512,
      timeout: cdk.Duration.seconds(3),
      logGroup: new LogGroup(this, 'AuthorizerLambdaLogGroup', {
        logGroupName: '/aws/lambda/dispose-me-authorizer',
        retention: RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    return new apigateway.RequestAuthorizer(this, 'ApiGatewayAuthorizer', {
      handler: authorizerLambdaHandler,
      identitySources: [],
      resultsCacheTtl: cdk.Duration.seconds(0),
    });
  };

  private setupEmailProcessing = (
    domainName: string,
    hostedZone: route53.IHostedZone,
    emailBucket: s3.IBucket,
    emailTable: dynamodb.ITableV2,
  ): void => {
    const processorLambdaHandler = new nodejs.NodejsFunction(this, 'ProcessorLambda', {
      functionName: 'dispose-me-processor',
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.AssetCode.fromAsset('dist/email-processor.zip'),
      handler: 'index.handler',
      environment: {
        DOMAIN_NAME: process.env.DOMAIN_NAME ?? '',
        EMAIL_BUCKET_NAME: emailBucket.bucketName,
        EMAIL_TTL_DAYS: process.env.EMAIL_TTL_DAYS ?? '1',
        LOG_LEVEL: '5',
      },
      memorySize: 512,
      timeout: cdk.Duration.seconds(3),
      logGroup: new LogGroup(this, 'ProcessorLambdaLogGroup', {
        logGroupName: '/aws/lambda/dispose-me-processor',
        retention: RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });
    emailBucket.grantReadWrite(processorLambdaHandler);
    emailTable.grantReadWriteData(processorLambdaHandler);

    new ses.EmailIdentity(this, 'EmailIdentity', {
      identity: ses.Identity.publicHostedZone(hostedZone),
      dkimSigning: true,
    });

    new route53.TxtRecord(this, 'SpfRecord', {
      zone: hostedZone,
      recordName: domainName,
      values: ['v=spf1 include:amazonses.com -all'],
    });

    new route53.TxtRecord(this, 'DmarcRecord', {
      zone: hostedZone,
      recordName: `_dmarc.${domainName}`,
      values: [`v=DMARC1; p=reject; rua=mailto:dmarc@${domainName}`],
    });

    new route53.MxRecord(this, 'MxRecord', {
      values: [
        {
          hostName: `inbound-smtp.${this.region}.amazonaws.com`,
          priority: 10,
        },
      ],
      zone: hostedZone,
    });

    const ruleSet = new ses.ReceiptRuleSet(this, 'RuleSet', {
      receiptRuleSetName: 'EmailHandling',
    });

    const blacklist = (process.env.INBOX_BLACKLIST ?? '').split(',');
    if (blacklist.length > 0) {
      const blacklistedRecipients = blacklist.map((username) => `${username}@${domainName}`);
      ruleSet.addRule('Blacklist', {
        receiptRuleName: 'Blacklist',
        recipients: blacklistedRecipients,
        actions: [new ses_actions.Stop()],
      });
    }
    ruleSet.addRule('Processing', {
      receiptRuleName: 'Processing',
      actions: [
        new ses_actions.S3({
          bucket: emailBucket,
        }),
        new ses_actions.Lambda({
          function: processorLambdaHandler,
        }),
      ],
    });

    // Workaround for enabling RuleSet as currently CDK doesn't allow that
    const awsSdkCall: cr.AwsSdkCall = {
      service: 'SES',
      action: 'setActiveReceiptRuleSet',
      physicalResourceId: cr.PhysicalResourceId.of('DefaultSesCustomResource'),
      parameters: {
        RuleSetName: ruleSet.receiptRuleSetName,
      },
    };
    new cr.AwsCustomResource(this, 'SesDefaultRuleSetCustomResource', {
      onCreate: awsSdkCall,
      onUpdate: awsSdkCall,
      onDelete: {
        ...awsSdkCall,
        parameters: {
          RuleSetName: null,
        },
      },
      logGroup: new LogGroup(this, 'SesCustomResourceLogGroup', {
        logGroupName: '/aws/custom-resources/ses-default-ruleset',
        retention: RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          sid: 'SesCustomResourceSetActiveReceiptRuleSet',
          effect: iam.Effect.ALLOW,
          actions: ['ses:SetActiveReceiptRuleSet'],
          resources: ['*'],
        }),
      ]),
      timeout: cdk.Duration.seconds(30),
    });
  };
}
