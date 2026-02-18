import * as cdk from 'aws-cdk-lib';
import type { IApiKey } from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  type AwsSdkCall,
  PhysicalResourceId,
} from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface GetApiKeyProps {
  apiKey: IApiKey;
}

export class GetApiKey extends Construct {
  value: string;

  constructor(scope: Construct, id: string, props: GetApiKeyProps) {
    super(scope, id);

    const apiKey: AwsSdkCall = {
      service: 'APIGateway',
      action: 'getApiKey',
      parameters: {
        apiKey: props.apiKey.keyId,
        includeValue: true,
      },
      physicalResourceId: PhysicalResourceId.of(`APIKey:${props.apiKey.keyId}`),
    };

    const apiKeyCr = new AwsCustomResource(this, 'GetApiKeyCr', {
      policy: AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [props.apiKey.keyArn],
          actions: ['apigateway:GET'],
        }),
      ]),
      logGroup: new LogGroup(this, 'GetApiKeyLogGroup', {
        logGroupName: '/aws/custom-resources/get-api-key',
        retention: RetentionDays.ONE_DAY,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      onCreate: apiKey,
      onUpdate: apiKey,
    });

    apiKeyCr.node.addDependency(props.apiKey);
    this.value = apiKeyCr.getResponseField('value');
  }
}
