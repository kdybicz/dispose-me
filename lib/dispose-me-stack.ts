import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import {
  aws_apigateway as apigateway,
  aws_certificatemanager as cm,
  custom_resources as cr,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_lambda_nodejs as nodejs,
  aws_route53 as route53,
  aws_s3 as s3,
  aws_ses as ses,
  aws_ses_actions as ses_actions,
  aws_route53_targets as targets,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export class DisposeMeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainName = process.env.DOMAIN_NAME ?? '';
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName,
    });

    const emailBucket = this.setupEmailBucket(domainName);

    this.setupApiGateway(domainName, hostedZone, emailBucket);
    this.setupEmailProcessing(domainName, hostedZone, emailBucket);
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

  private setupApiGateway = (
    domainName: string,
    hostedZone: route53.IHostedZone,
    emailBucket: s3.IBucket,
  ): void => {
    // Define Lambda function
    const apiLambdaHandler = new nodejs.NodejsFunction(this, 'ApiLambda', {
      functionName: 'dispose-me-api',
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.AssetCode.fromAsset('dist/api.zip'),
      handler: 'index.handler',
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        EMAIL_BUCKET_NAME: process.env.DOMAIN_NAME ?? '',
        DOMAIN_NAME: process.env.DOMAIN_NAME ?? '',
        INBOX_BLACKLIST: process.env.INBOX_BLACKLIST ?? '',
        LOG_LEVEL: '5',
        PRIVATE_ACCESS: process.env.PRIVATE_ACCESS ?? 'true',
      },
      memorySize: 512,
      timeout: cdk.Duration.seconds(3),
      logRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
    });
    emailBucket.grantReadWrite(apiLambdaHandler);

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
    });

    // Create API Authorizer
    const apiAuthorizer = this.setupApiAuthorizer();
    const privateAccess = process.env.PRIVATE_ACCESS !== 'false';

    // Define the '/' resource with a GET method
    const rootResource = api.root;
    rootResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: apigateway.Cors.ALL_METHODS, // this is also the default
    });
    rootResource.addMethod('GET', undefined, {
      apiKeyRequired: privateAccess,
      authorizer: apiAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Define the '/*' resource with a GET method
    const proxyResource = api.root.addResource('{proxy+}');
    proxyResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: apigateway.Cors.ALL_METHODS, // this is also the default
    });
    proxyResource.addMethod('GET', undefined, {
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
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.AssetCode.fromAsset('dist/authorizer.zip'),
      handler: 'index.handler',
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        LOG_LEVEL: '5',
      },
      memorySize: 512,
      timeout: cdk.Duration.seconds(3),
      logRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
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
  ): void => {
    const processorLambdaHandler = new nodejs.NodejsFunction(this, 'ProcessorLambda', {
      functionName: 'dispose-me-processor',
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.AssetCode.fromAsset('dist/email-processor.zip'),
      handler: 'index.handler',
      environment: {
        EMAIL_BUCKET_NAME: emailBucket.bucketName,
        LOG_LEVEL: '5',
      },
      memorySize: 512,
      timeout: cdk.Duration.seconds(3),
      logRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
    });
    emailBucket.grantReadWrite(processorLambdaHandler);

    new ses.EmailIdentity(this, 'EmailIdentity', {
      identity: ses.Identity.publicHostedZone(hostedZone),
      dkimSigning: true,
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
      logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK,
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
