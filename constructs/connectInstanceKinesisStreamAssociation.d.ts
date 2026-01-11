import { Construct } from 'constructs';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
/**
 * Resource types supported by Amazon Connect Instance Storage Config for Kinesis Streams
 */
export type ConnectKinesisResourceType = 'CONTACT_TRACE_RECORDS' | 'AGENT_EVENTS' | 'REAL_TIME_CONTACT_ANALYSIS_SEGMENTS' | 'REAL_TIME_CONTACT_ANALYSIS_CHAT_SEGMENTS' | 'REAL_TIME_CONTACT_ANALYSIS_VOICE_SEGMENTS';
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
export declare class ConnectInstanceKinesisStreamAssociation extends Construct {
    /**
     * The AwsCustomResource that performs the association
     */
    readonly customResource: cr.AwsCustomResource;
    constructor(scope: Construct, id: string, props: ConnectInstanceKinesisStreamAssociationProps);
}
