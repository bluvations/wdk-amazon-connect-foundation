# Amazon Connect Foundation Constructs

This directory contains custom CDK constructs for Amazon Connect that extend functionality beyond what's available in CloudFormation.

## ConnectInstanceS3StorageAssociation

**⭐ RECOMMENDED for S3** - A lightweight construct that uses `AwsCustomResource` to associate S3 storage with Amazon Connect instances. This is the preferred approach for S3 storage associations as it doesn't require deploying Lambda functions.

### Why Use This Construct?

- ✅ **Lightweight**: Uses `AwsCustomResource` instead of custom Lambda functions
- ✅ **Less code**: Simpler implementation with fewer moving parts
- ✅ **Reusable**: Clean, focused API for S3 storage associations
- ✅ **No Lambda deployment**: Reduces deployment complexity and cold start issues
- ✅ **Built-in permissions**: Automatically grants necessary S3 and KMS permissions

### Usage Example

```typescript
import { ConnectInstanceS3StorageAssociation } from './constructs/connectInstanceS3StorageAssociation';

const attachmentsAssociation = new ConnectInstanceS3StorageAssociation(this, 'AttachmentsAssociation', {
  prefix: 'my-connect',
  connectInstanceArn: connectInstance.attrArn,
  connectInstanceServiceRoleArn: connectInstance.attrServiceRole,
  resourceType: 'ATTACHMENTS',
  bucket: attachmentsBucket.bucket,
  bucketPrefix: 'attachments',
  key: kmsKey,
});

// Add dependency to ensure proper creation order
attachmentsAssociation.customResource.node.addDependency(connectInstance);
```

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `prefix` | string | Yes | Prefix for resource naming |
| `connectInstanceArn` | string | Yes | The Amazon Connect instance ARN |
| `connectInstanceServiceRoleArn` | string | Yes | The Amazon Connect service role ARN (use `connectInstance.attrServiceRole`) |
| `resourceType` | ConnectResourceType | Yes | The resource type (e.g., 'ATTACHMENTS', 'SCREEN_RECORDINGS') |
| `bucket` | s3.IBucket | Yes | The S3 bucket to associate |
| `bucketPrefix` | string | Yes | The bucket prefix for the resource type |
| `key` | kms.IKey | Yes | The KMS key for encryption |

### When to Use

Use `ConnectInstanceS3StorageAssociation` when:
- You need to associate S3 storage with Amazon Connect
- You want a simple, lightweight solution
- You're working with resource types like ATTACHMENTS, SCREEN_RECORDINGS, CONTACT_EVALUATIONS

---

## ConnectInstanceKinesisStreamAssociation

**⭐ RECOMMENDED for Kinesis Streams** - A lightweight construct that uses `AwsCustomResource` to associate Kinesis Data Streams with Amazon Connect instances. This is the preferred approach for Kinesis Stream associations as it doesn't require deploying Lambda functions.

### Why Use This Construct?

- ✅ **Lightweight**: Uses `AwsCustomResource` instead of custom Lambda functions
- ✅ **Less code**: Simpler implementation with fewer moving parts
- ✅ **Reusable**: Clean, focused API for Kinesis Stream associations
- ✅ **No Lambda deployment**: Reduces deployment complexity and cold start issues
- ✅ **Built-in permissions**: Automatically grants necessary Kinesis write permissions

### Usage Example

```typescript
import { ConnectInstanceKinesisStreamAssociation } from './constructs/connectInstanceKinesisStreamAssociation';

const ctrStreamAssociation = new ConnectInstanceKinesisStreamAssociation(this, 'CTRStreamAssociation', {
  prefix: 'my-connect',
  connectInstanceArn: connectInstance.attrArn,
  connectInstanceServiceRoleArn: connectInstance.attrServiceRole,
  resourceType: 'CONTACT_TRACE_RECORDS',
  stream: ctrStream.stream,
});

// Add dependency to ensure proper creation order
ctrStreamAssociation.customResource.node.addDependency(connectInstance);
```

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `prefix` | string | Yes | Prefix for resource naming |
| `connectInstanceArn` | string | Yes | The Amazon Connect instance ARN |
| `connectInstanceServiceRoleArn` | string | Yes | The Amazon Connect service role ARN (use `connectInstance.attrServiceRole`) |
| `resourceType` | ConnectKinesisResourceType | Yes | The resource type (e.g., 'CONTACT_TRACE_RECORDS', 'AGENT_EVENTS') |
| `stream` | kinesis.IStream | Yes | The Kinesis Data Stream to associate |

### Supported Resource Types

- `CONTACT_TRACE_RECORDS` - Contact trace records (CTRs)
- `AGENT_EVENTS` - Agent status change events
- `REAL_TIME_CONTACT_ANALYSIS_SEGMENTS` - Real-time contact analysis (deprecated)
- `REAL_TIME_CONTACT_ANALYSIS_CHAT_SEGMENTS` - Real-time chat analysis
- `REAL_TIME_CONTACT_ANALYSIS_VOICE_SEGMENTS` - Real-time voice analysis

### When to Use

Use `ConnectInstanceKinesisStreamAssociation` when:
- You need to associate Kinesis Data Streams with Amazon Connect
- You want a simple, lightweight solution
- You're working with streaming data like CTRs, agent events, or real-time analysis

---

## When to Use Each Construct

- **ConnectInstanceS3StorageAssociation**: For S3 storage (ATTACHMENTS, SCREEN_RECORDINGS, CONTACT_EVALUATIONS, etc.)
- **ConnectInstanceKinesisStreamAssociation**: For Kinesis Data Streams (CTRs, AGENT_EVENTS, real-time analysis)
- **ConnectInstanceStorageConfig** (below): For Kinesis Video Streams or if you need the full flexibility of the AWS SDK

---

## ConnectInstanceStorageConfig

A custom CDK construct that uses the AWS SDK to create, update, and delete Amazon Connect instance storage configurations. This construct supports all resource types, including those not yet available in CloudFormation's `CfnInstanceStorageConfig`.

### Why Use This Construct?

The CloudFormation `CfnInstanceStorageConfig` resource has limitations and doesn't support all resource types that are available in the AWS Connect API. This custom construct uses AWS SDK v3 to directly call the Connect API, providing full support for:

- ✅ All current resource types
- ✅ Future resource types as they become available
- ✅ Update and delete operations
- ✅ Proper CloudFormation lifecycle management

### Supported Resource Types

- `CHAT_TRANSCRIPTS` - Chat conversation transcripts
- `CALL_RECORDINGS` - Audio recordings of calls
- `SCHEDULED_REPORTS` - Scheduled reports
- `MEDIA_STREAMS` - Real-time media streams
- `CONTACT_TRACE_RECORDS` - Contact trace records (CTRs)
- `AGENT_EVENTS` - Agent status change events
- `REAL_TIME_CONTACT_ANALYSIS_SEGMENTS` - Real-time contact analysis (deprecated)
- `ATTACHMENTS` - File attachments
- `CONTACT_EVALUATIONS` - Contact evaluations
- `SCREEN_RECORDINGS` - Screen recordings
- `REAL_TIME_CONTACT_ANALYSIS_CHAT_SEGMENTS` - Real-time chat analysis
- `REAL_TIME_CONTACT_ANALYSIS_VOICE_SEGMENTS` - Real-time voice analysis
- `EMAIL_MESSAGES` - Email messages

### Supported Storage Types

- `S3` - Amazon S3 bucket storage
- `KINESIS_STREAM` - Amazon Kinesis Data Stream
- `KINESIS_FIREHOSE` - Amazon Kinesis Data Firehose
- `KINESIS_VIDEO_STREAM` - Amazon Kinesis Video Stream

### Usage Examples

#### S3 Storage for Screen Recordings

```typescript
import { ConnectInstanceStorageConfig } from './constructs/connectInstanceStorageConfig';

const screenRecordingsConfig = new ConnectInstanceStorageConfig(this, 'ScreenRecordingsConfig', {
  instanceId: connectInstance.attrId,
  resourceType: 'SCREEN_RECORDINGS',
  storageType: 'S3',
  s3Config: {
    bucketName: bucket.bucketName,
    bucketPrefix: 'screen-recordings',
  },
});
```

#### S3 Storage with KMS Encryption

```typescript
const contactEvaluationsConfig = new ConnectInstanceStorageConfig(this, 'ContactEvaluationsConfig', {
  instanceId: connectInstance.attrId,
  resourceType: 'CONTACT_EVALUATIONS',
  storageType: 'S3',
  s3Config: {
    bucketName: bucket.bucketName,
    bucketPrefix: 'evaluations',
    encryptionType: 'KMS',
    encryptionKeyId: kmsKey.keyArn,
  },
});
```

#### Kinesis Stream for Real-Time Analysis

```typescript
const realtimeAnalysisConfig = new ConnectInstanceStorageConfig(this, 'RealtimeAnalysisConfig', {
  instanceId: connectInstance.attrId,
  resourceType: 'REAL_TIME_CONTACT_ANALYSIS_VOICE_SEGMENTS',
  storageType: 'KINESIS_STREAM',
  kinesisStreamConfig: {
    streamArn: kinesisStream.streamArn,
  },
});
```

#### Kinesis Video Stream for Media Streams

```typescript
const mediaStreamsConfig = new ConnectInstanceStorageConfig(this, 'MediaStreamsConfig', {
  instanceId: connectInstance.attrId,
  resourceType: 'MEDIA_STREAMS',
  storageType: 'KINESIS_VIDEO_STREAM',
  kinesisVideoStreamConfig: {
    prefix: 'callAudio',
    retentionPeriodHours: 72,
    encryptionType: 'KMS',
    encryptionKeyId: kmsKey.keyArn,
  },
});
```

### Properties

#### ConnectInstanceStorageConfigProps

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `instanceId` | string | Yes | The Amazon Connect instance ID or ARN |
| `resourceType` | ConnectResourceType | Yes | The resource type to associate storage with |
| `storageType` | ConnectStorageType | Yes | The storage type (S3, KINESIS_STREAM, etc.) |
| `s3Config` | S3StorageConfig | Conditional | Required if storageType is S3 |
| `kinesisStreamConfig` | KinesisStreamConfig | Conditional | Required if storageType is KINESIS_STREAM |
| `kinesisFirehoseConfig` | KinesisFirehoseConfig | Conditional | Required if storageType is KINESIS_FIREHOSE |
| `kinesisVideoStreamConfig` | KinesisVideoStreamConfig | Conditional | Required if storageType is KINESIS_VIDEO_STREAM |

#### S3StorageConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `bucketName` | string | Yes | The S3 bucket name |
| `bucketPrefix` | string | No | The prefix for objects in the bucket |
| `encryptionType` | 'KMS' | No | Encryption type (only KMS is supported) |
| `encryptionKeyId` | string | No | KMS key ID or ARN for encryption |

#### KinesisStreamConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `streamArn` | string | Yes | The Kinesis Data Stream ARN |

#### KinesisVideoStreamConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `prefix` | string | Yes | The prefix for Kinesis Video Streams |
| `retentionPeriodHours` | number | No | Retention period in hours (default: 72) |
| `encryptionType` | 'KMS' | Yes | Encryption type (must be KMS) |
| `encryptionKeyId` | string | Yes | KMS key ID or ARN for encryption |

### Outputs

The construct provides the following output:

- `associationId` - The unique association ID returned by Amazon Connect

### Dependencies

This construct requires the following npm package:

```json
{
  "dependencies": {
    "@aws-sdk/client-connect": "^3.908.0"
  }
}
```

### How It Works

The construct creates a Lambda-backed Custom Resource that:

1. **Create**: Calls `AssociateInstanceStorageConfigCommand` to create the storage association
2. **Update**: Calls `UpdateInstanceStorageConfigCommand` to update the configuration, or recreates if instance/resource type changes
3. **Delete**: Calls `DisassociateInstanceStorageConfigCommand` to remove the association

The Lambda function is automatically created with appropriate IAM permissions for:
- Amazon Connect API operations
- S3 bucket access (if using S3 storage)
- KMS key access (if encryption is configured)

### Best Practices

1. **Dependencies**: Always add the construct as a dependency of the Connect instance:
   ```typescript
   storageConfig.node.addDependency(connectInstance);
   ```

2. **Bucket Permissions**: Ensure your S3 buckets have appropriate bucket policies to allow Amazon Connect to write to them.

3. **KMS Keys**: Use the same KMS key for all Amazon Connect resources to avoid permission issues.

4. **Error Handling**: Check CloudWatch Logs for the Lambda function if the custom resource fails.

### Troubleshooting

If the custom resource fails:

1. Check the Lambda function logs in CloudWatch
2. Verify the Connect instance exists and is in ACTIVE state
3. Ensure S3 buckets exist before creating the storage config
4. Verify IAM permissions for the Lambda execution role
5. Check that the resource type is supported by your Connect instance

### Migration from CfnInstanceStorageConfig

To migrate from `CfnInstanceStorageConfig` to this custom construct:

```typescript
// Old way (limited resource types)
const oldConfig = new CfnInstanceStorageConfig(this, 'Config', {
  instanceArn: connectInstance.attrArn,
  storageType: 'S3',
  resourceType: 'CALL_RECORDINGS',
  s3Config: {
    bucketName: bucket.bucketName,
    bucketPrefix: 'recordings',
  },
});

// New way (all resource types supported)
const newConfig = new ConnectInstanceStorageConfig(this, 'Config', {
  instanceId: connectInstance.attrId,  // Can use ID or ARN
  storageType: 'S3',
  resourceType: 'SCREEN_RECORDINGS',  // Now supports all types!
  s3Config: {
    bucketName: bucket.bucketName,
    bucketPrefix: 'screen-recordings',
  },
});
```

### License

This construct is part of the WDK (Windsurf Development Kit) project.
