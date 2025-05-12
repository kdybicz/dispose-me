import type { IApiKey } from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
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
      logRetention: RetentionDays.ONE_DAY,
      onCreate: apiKey,
      onUpdate: apiKey,
    });

    apiKeyCr.node.addDependency(props.apiKey);
    this.value = apiKeyCr.getResponseField('value');
  }
}
