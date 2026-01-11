import { Construct } from 'constructs';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';

/**
 * Resource types supported by Amazon Connect Instance Storage Config
 */
export type ConnectResourceType = 
  | 'CHAT_TRANSCRIPTS'
  | 'CALL_RECORDINGS'
  | 'SCHEDULED_REPORTS'
  | 'MEDIA_STREAMS'
  | 'CONTACT_TRACE_RECORDS'
  | 'AGENT_EVENTS'
  | 'REAL_TIME_CONTACT_ANALYSIS_SEGMENTS'
  | 'ATTACHMENTS'
  | 'CONTACT_EVALUATIONS'
  | 'SCREEN_RECORDINGS'
  | 'REAL_TIME_CONTACT_ANALYSIS_CHAT_SEGMENTS'
  | 'REAL_TIME_CONTACT_ANALYSIS_VOICE_SEGMENTS'
  | 'EMAIL_MESSAGES';

/**
 * Properties for ConnectInstanceS3StorageAssociation construct
 */
export interface ConnectInstanceS3StorageAssociationProps {
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
  readonly resourceType: ConnectResourceType;

  /**
   * The S3 bucket to associate
   */
  readonly bucket: s3.IBucket;

  /**
   * The bucket prefix for the resource type
   */
  readonly bucketPrefix: string;

  /**
   * The KMS key for encryption
   */
  readonly key: kms.IKey;
}

/**
 * Reusable construct for associating S3 storage with Amazon Connect instance
 * using AwsCustomResource.
 * 
 * This construct uses the AWS SDK to call the Connect API directly, which is
 * more lightweight than a custom Lambda function and doesn't require deploying
 * additional Lambda code.
 * 
 * @example
 * ```typescript
 * const attachmentsAssociation = new ConnectInstanceS3StorageAssociation(this, 'AttachmentsAssociation', {
 *   prefix: 'my-connect',
 *   connectInstanceArn: connectInstance.attrArn,
 *   connectInstanceServiceRoleArn: connectInstance.attrServiceRole,
 *   resourceType: 'ATTACHMENTS',
 *   bucket: attachmentsBucket.bucket,
 *   bucketPrefix: 'attachments',
 *   key: kmsKey,
 * });
 * ```
 */
export class ConnectInstanceS3StorageAssociation extends Construct {
  /**
   * The AwsCustomResource that performs the association
   */
  public readonly customResource: cr.AwsCustomResource;

  constructor(scope: Construct, id: string, props: ConnectInstanceS3StorageAssociationProps) {
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
            StorageType: 'S3',
            S3Config: {
              BucketName: props.bucket.bucketName,
              BucketPrefix: props.bucketPrefix,
              EncryptionConfig: {
                EncryptionType: 'KMS',
                KeyId: props.key.keyArn,
              },
            },
          },
        },
        physicalResourceId: cr.PhysicalResourceId.of(`${props.prefix}-${props.resourceType}-storage-association`),
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
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:*"],
          resources: [props.bucket.bucketArn],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["kms:*"],
          resources: [props.key.keyArn],
        }),
      ]),
    });
  }
}
