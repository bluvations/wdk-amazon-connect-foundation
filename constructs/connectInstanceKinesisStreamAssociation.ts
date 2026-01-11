import { Construct } from 'constructs';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';

/**
 * Resource types supported by Amazon Connect Instance Storage Config for Kinesis Streams
 */
export type ConnectKinesisResourceType = 
  | 'CONTACT_TRACE_RECORDS'
  | 'AGENT_EVENTS'
  | 'REAL_TIME_CONTACT_ANALYSIS_SEGMENTS'
  | 'REAL_TIME_CONTACT_ANALYSIS_CHAT_SEGMENTS'
  | 'REAL_TIME_CONTACT_ANALYSIS_VOICE_SEGMENTS';

/**
 * Properties for ConnectInstanceKinesisStreamAssociation construct
 */
export interface ConnectInstanceKinesisStreamAssociationProps {
  /**
   * Prefix for resource naming
   */
  readonly prefix: string;

  /**
   * The Amazon Connect instance ARN
   */
  readonly connectInstanceArn: string;

  /**
   * The Amazon Connect instance service role ARN
   * This is typically available as connectInstance.attrServiceRole
   */
  readonly connectInstanceServiceRoleArn: string;

  /**
   * The resource type to associate storage with
   */
  readonly resourceType: ConnectKinesisResourceType;

  /**
   * The Kinesis Data Stream to associate
   */
  readonly stream: kinesis.IStream;
}

/**
 * Reusable construct for associating Kinesis Data Stream storage with Amazon Connect instance
 * using AwsCustomResource.
 * 
 * This construct uses the AWS SDK to call the Connect API directly, which is
 * more lightweight than a custom Lambda function and doesn't require deploying
 * additional Lambda code.
 * 
 * @example
 * ```typescript
 * const ctrStreamAssociation = new ConnectInstanceKinesisStreamAssociation(this, 'CTRStreamAssociation', {
 *   prefix: 'my-connect',
 *   connectInstanceArn: connectInstance.attrArn,
 *   connectInstanceServiceRoleArn: connectInstance.attrServiceRole,
 *   resourceType: 'CONTACT_TRACE_RECORDS',
 *   stream: ctrStream,
 * });
 * ```
 */
export class ConnectInstanceKinesisStreamAssociation extends Construct {
  /**
   * The AwsCustomResource that performs the association
   */
  public readonly customResource: cr.AwsCustomResource;

  constructor(scope: Construct, id: string, props: ConnectInstanceKinesisStreamAssociationProps) {
    super(scope, id);

    // Create the custom resource to associate the storage config
    this.customResource = new cr.AwsCustomResource(this, props.prefix + `-${props.resourceType.toLowerCase()}-association`, {
      onCreate: {
        service: 'Connect',
        action: 'associateInstanceStorageConfig',
        parameters: {
          InstanceId: props.connectInstanceArn,
          ResourceType: props.resourceType,
          StorageConfig: {
            StorageType: 'KINESIS_STREAM',
            KinesisStreamConfig: {
              StreamArn: props.stream.streamArn,
            },
          },
        },
        physicalResourceId: cr.PhysicalResourceId.of(`${props.prefix}-${props.resourceType}-stream-association`),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['connect:AssociateInstanceStorageConfig'],
          resources: [props.connectInstanceArn],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['iam:PutRolePolicy'],
          resources: [props.connectInstanceServiceRoleArn],
        }),
      ]),
    });

    // Grant the custom resource permissions to write to the Kinesis stream
    props.stream.grantWrite(this.customResource);
  }
}
