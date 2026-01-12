import { WdkModule, WdkModuleProps } from '../wdk/wdk-module';
import { Construct } from 'constructs';
import { Alias, IKey, Key } from 'aws-cdk-lib/aws-kms';
import { CfnInstance, CfnInstanceStorageConfig} from "aws-cdk-lib/aws-connect"
import { WdkS3 } from '../wdk/constructs/wdkS3';
import { WdkKinesisStream } from '../wdk/constructs/wdkKinesisStream';
import { ConnectInstanceS3StorageAssociation } from './constructs/connectInstanceS3StorageAssociation';
import { ConnectInstanceKinesisStreamAssociation } from './constructs/connectInstanceKinesisStreamAssociation';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from "aws-cdk-lib/custom-resources";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";

export interface AmazonConnectFoundationStackProps extends WdkModuleProps {
  foundationEncryptionKeyAlias: string;
  foundationEncryptionKeyArn: string;
  separateChatTranscriptsBucket: boolean;
  separateScheduledReportsBucket?: boolean;
  separateAttachmentsBucket?: boolean;
  separateContactEvaluationsBucket?: boolean;
  separateScreenRecordingsBucket?: boolean;
  separateEmailMessagesBucket?: boolean;
  enableCTRStream?: boolean;
  enableAgentEventsStream?: boolean;
  enableRealTimeContactAnalysisChatSegmentsStream?: boolean;
  enableRealTimeContactAnalysisVoiceSegmentsStream?: boolean;
  enableHighVolumeOutbound?: boolean;
}

export class AmazonConnectFoundationStack extends WdkModule<AmazonConnectFoundationStackProps> {
  constructor(scope: Construct, id: string, props: AmazonConnectFoundationStackProps) {
    super(scope, id, props);
  }

  protected initialize(): void {
    const prefix =  this.prefixName + "-" + this.stageName;
    /**
     * KMS Key for WDK Amazon Connect Resources
     * 
     * @type {Key}
     * @description We recommend using the same KMS key for all WDK resources in your Amazon Connect environemnt 
     * to ensure consistency and make sure Amazon Connect can access all of the resources you need. This avoids silent errors
     * where Amazon Connect may try and write to a resource that it doesn't have access to because of a different KMS key.
     */
    const kmsKey: IKey = Alias.fromAliasName(
      this,
      'FoundationEncryptionKey',
      this.props.foundationEncryptionKeyAlias
    );

    const foundationEncryptionKey = Key.fromKeyArn(this, 'FoundationEncryptionKey', this.props.foundationEncryptionKeyArn);


    const connectInstance = new CfnInstance(this, prefix + '-amazon-connect-instance', {
      instanceAlias: prefix,
      identityManagementType: 'SAML',
      attributes: {
        autoResolveBestVoices: true,
        highVolumeOutBound: this.props.enableHighVolumeOutbound ?? true,
        contactflowLogs: true,
        outboundCalls: true,
        inboundCalls: true,
        contactLens: true,
        enhancedContactMonitoring: true,
        enhancedChatMonitoring: true,
        earlyMedia: true,
        multiPartyConference: true,
        multiPartyChatConference:true,
      },
    });
    this.createOutput('ConnectInstanceArn', connectInstance.attrArn, 'arn', true);
    this.createOutput('ConnectInstanceId', connectInstance.attrId, 'string', true);
    this.createOutput('ConnectInstanceAlias', prefix, 'string', true);

    const connectBucket = new WdkS3(this, prefix + '-amazon-connect-bucket', {
      prefix: prefix,
      bucketName: prefix + '-amazon-connect-bucket',
      encryptionKey: kmsKey,
    } );

    connectBucket.node.addDependency(kmsKey);

    const callRecordingsinstanceStorageConfig = new CfnInstanceStorageConfig(this, prefix + '-audio-recordings-storage-config', {
      instanceArn: connectInstance.attrArn,
      storageType: 'S3',
      resourceType: 'CALL_RECORDINGS',
      s3Config: {
        bucketName: connectBucket.bucketName,
        bucketPrefix: 'audio-recordings',
      },
    });

    callRecordingsinstanceStorageConfig.node.addDependency(connectInstance);
    callRecordingsinstanceStorageConfig.node.addDependency(connectBucket);

    /*
    Configure storage and association for chat transcripts
    */
    let chatTranscriptsBucketName = connectBucket.bucketName;
    let chatTranscriptsBucket;
    if(  this.props.separateChatTranscriptsBucket ) {
      const chatTranscriptsBucket = new WdkS3(this, prefix + '-chat-transcripts-bucket', {
        prefix: prefix,
        bucketName: prefix + '-chat-transcripts-bucket',
        encryptionKey: foundationEncryptionKey,
      } );
      chatTranscriptsBucketName = chatTranscriptsBucket.bucketName;

      chatTranscriptsBucket.bucket.node.addDependency(foundationEncryptionKey);
    }
    const chatTranscrInstanceStorageConfig = new CfnInstanceStorageConfig(this, prefix + '-chat-transcripts-storage-config', {
      instanceArn: connectInstance.attrArn,
      storageType: 'S3',
      resourceType: 'CHAT_TRANSCRIPTS',
      s3Config: {
        bucketName: chatTranscriptsBucketName,
        bucketPrefix: 'chat-transcripts',
      },
    });
    chatTranscrInstanceStorageConfig.node.addDependency(connectInstance);
    if(chatTranscriptsBucket) {
    chatTranscrInstanceStorageConfig.node.addDependency(chatTranscriptsBucket);
    }
    this.createOutput('ChatTranscriptsBucketName', chatTranscriptsBucketName, 'string', true);
    this.createOutput('ChatTranscriptsBucketArn', `arn:aws:s3:::${chatTranscriptsBucketName}`, 'arn', true);
    this.createOutput('ChatTranscriptsBucketPrefix', 'chat-transcripts', 'string', true);

    /*
    Configure storage and association for scheduled reports
    */
    let scheduledReportsBucketName = connectBucket.bucketName;
    let scheduledReportsBucket;
    if(  this.props.separateScheduledReportsBucket ) {
      const scheduledReportsBucket = new WdkS3(this, prefix + '-scheduled-reports-bucket', {
        prefix: prefix,
        bucketName: prefix + '-scheduled-reports-bucket',
        encryptionKey: foundationEncryptionKey,
      } );
      scheduledReportsBucketName = scheduledReportsBucket.bucketName;
      scheduledReportsBucket.bucket.node.addDependency(foundationEncryptionKey);
    }
    const scheduledReportsInstanceStorageConfig = new CfnInstanceStorageConfig(this, prefix + '-scheduled-reports-storage-config', {
      instanceArn: connectInstance.attrArn,
      storageType: 'S3',
      resourceType: 'SCHEDULED_REPORTS',
      s3Config: {
        bucketName: scheduledReportsBucketName,
        bucketPrefix: 'scheduled-reports',
      },
    });
    scheduledReportsInstanceStorageConfig.node.addDependency(connectInstance);
    if(scheduledReportsBucket) {
    scheduledReportsInstanceStorageConfig.node.addDependency(scheduledReportsBucket);
    }
    this.createOutput('ScheduledReportsBucketName', scheduledReportsBucketName, 'string', true);
    this.createOutput('ScheduledReportsBucketArn', `arn:aws:s3:::${scheduledReportsBucketName}`, 'arn', true);
    this.createOutput('ScheduledReportsBucketPrefix', 'scheduled-reports', 'string', true);

    /*
    Configure storage and association for contact trace records
    */
    let ctrSteamEnabled = false;
    let ctrStreamName = "";
    if( this.props.enableCTRStream ) {
      ctrSteamEnabled = true;
      ctrStreamName = prefix + '-ctr-stream';
      const ctrStream = new WdkKinesisStream(this, prefix + '-ctr-stream', {
        prefix: prefix,
        streamName: ctrStreamName,
        encryptionKey: foundationEncryptionKey,
      } );

      const ctrStreamInstanceStorageConfig = new CfnInstanceStorageConfig(this, prefix + '-ctr-stream-storage-config', {
        instanceArn: connectInstance.attrArn,
        storageType: 'KINESIS_STREAM',
        resourceType: 'CONTACT_TRACE_RECORDS',
        kinesisStreamConfig: {
          streamArn: ctrStream.streamArn,
        },
      });
      ctrStreamInstanceStorageConfig.node.addDependency(connectInstance);
    }
    this.createOutput('CTRStreamEnabled', ctrSteamEnabled ? 'true' : 'false', 'string', true);
    this.createOutput('CTRStreamName', ctrStreamName, 'string', true);

    /*
    Configure stream and associate for agent events 
    */
    let agentEventsStreamName = "";
    if( this.props.enableAgentEventsStream ) {
      agentEventsStreamName = prefix + '-agent-events-stream';
      const agentEventsStream = new WdkKinesisStream(this, prefix + '-agent-events-stream', {
        prefix: prefix,
        streamName: agentEventsStreamName,
        encryptionKey: foundationEncryptionKey,
      } );

      const agentEventsStreamInstanceStorageConfig = new CfnInstanceStorageConfig(this, prefix + '-agent-events-stream-storage-config', {
        instanceArn: connectInstance.attrArn,
        storageType: 'KINESIS_STREAM',
        resourceType: 'AGENT_EVENTS',
        kinesisStreamConfig: {
          streamArn: agentEventsStream.streamArn,
        },
      });
      agentEventsStreamInstanceStorageConfig.node.addDependency(connectInstance);
    }
    this.createOutput('AgentEventsStreamEnabled', this.props.enableAgentEventsStream ? 'true' : 'false', 'string', true);
    this.createOutput('AgentEventsStreamName', agentEventsStreamName, 'string', true);

    /*
    Configure KVS Steeam Association for Connect Media Streams
    */

      const mediaStreamsStreamInstanceStorageConfig = new CfnInstanceStorageConfig(this, prefix + '-media-streams-stream-storage-config', {
        instanceArn: connectInstance.attrArn,
        storageType: 'KINESIS_VIDEO_STREAM',
        resourceType: 'MEDIA_STREAMS',
        kinesisVideoStreamConfig: {
          encryptionConfig: {
            encryptionType: "KMS",
            keyId: this.props.foundationEncryptionKeyArn,
          },
          prefix: "callAudio",
          retentionPeriodHours: 72,
        },
      });

      mediaStreamsStreamInstanceStorageConfig.node.addDependency(connectInstance);

    this.createOutput('MediaStreamsPrefix', 'callAudio', 'string', true);

    /*
    Configure storage and association for screen recordings
    */
    let screenRecordingsBucketName = connectBucket.bucketName;
    let screenRecordingsBucketInstance = connectBucket.bucket;

    if( this.props.separateScreenRecordingsBucket ) {
        const screenRecordingsBucket = new WdkS3(this, prefix + '-screen-recordings-bucket', {
        prefix: prefix,
        bucketName: prefix + '-screen-recordings-bucket',
        encryptionKey: foundationEncryptionKey,
      } );
      screenRecordingsBucketName = screenRecordingsBucket.bucketName;
      screenRecordingsBucketInstance = screenRecordingsBucket.bucket;
      screenRecordingsBucketInstance.node.addDependency(foundationEncryptionKey);
    }
    
    // Use the new AwsCustomResource-based construct for screen recordings
    const screenRecordingsAssociation = new ConnectInstanceS3StorageAssociation(this, prefix + '-screen-recordings-association', {
      prefix: prefix,
      connectInstanceArn: connectInstance.attrArn,
      connectInstanceServiceRoleArn: connectInstance.attrServiceRole,
      resourceType: 'SCREEN_RECORDINGS',
      bucket: screenRecordingsBucketInstance,
      bucketPrefix: 'screen-recordings',
      key: foundationEncryptionKey,
    });

    // Ensure the storage config is created after the instance
    screenRecordingsAssociation.customResource.node.addDependency(scheduledReportsInstanceStorageConfig);
    screenRecordingsAssociation.customResource.node.addDependency(connectInstance);
    screenRecordingsAssociation.customResource.node.addDependency(screenRecordingsBucketInstance);
    screenRecordingsAssociation.customResource.node.addDependency(kmsKey);
    
    this.createOutput('ScreenRecordingsBucketName', screenRecordingsBucketName, 'string', true);
    this.createOutput('ScreenRecordingsBucketArn', `arn:aws:s3:::${screenRecordingsBucketName}`, 'arn', true);
    this.createOutput('ScreenRecordingsBucketPrefix', 'screen-recordings', 'string', true);
 
    /*
    Configure storage and association for attchments
    */
    let attachmentsBucketName = connectBucket.bucketName;
    let attachmentsBucketInstance = connectBucket.bucket;
    if( this.props.separateAttachmentsBucket ) {
       const attachmentsBucket = new WdkS3(this, prefix + '-attachments-bucket', {
        prefix: prefix,
        bucketName: prefix + '-attachments-bucket',
        encryptionKey: foundationEncryptionKey,
      } );
      attachmentsBucketName = attachmentsBucket.bucketName;
      attachmentsBucketInstance = attachmentsBucket.bucket;
      attachmentsBucketInstance.node.addDependency(foundationEncryptionKey);
    }
    
    // Use the new AwsCustomResource-based construct for attachments
    const attachmentsAssociation = new ConnectInstanceS3StorageAssociation(this, prefix + '-attachments-association', {
      prefix: prefix,
      connectInstanceArn: connectInstance.attrArn,
      connectInstanceServiceRoleArn: connectInstance.attrServiceRole,
      resourceType: 'ATTACHMENTS',
      bucket: attachmentsBucketInstance,
      bucketPrefix: 'attachments',
      key: kmsKey,
    });
    
    // Ensure the storage config is created after the instance
    attachmentsAssociation.customResource.node.addDependency(scheduledReportsInstanceStorageConfig);
    attachmentsAssociation.customResource.node.addDependency(connectInstance);
    attachmentsAssociation.customResource.node.addDependency(attachmentsBucketInstance);
    attachmentsAssociation.customResource.node.addDependency(kmsKey);
    
    this.createOutput('AttachmentsBucketName', attachmentsBucketName, 'string', true);
    this.createOutput('AttachmentsBucketArn', `arn:aws:s3:::${attachmentsBucketName}`, 'arn', true);
    this.createOutput('AttachmentsBucketPrefix', 'attachments', 'string', true);


    /*
    Configure storage and association for contact evaluations
    */
    let contactEvaluationsBucketName = connectBucket.bucketName;
    let contactEvaluationsBucketInstance = connectBucket.bucket;
    if( this.props.separateContactEvaluationsBucket ) {
        const contactEvaluationsBucket = new WdkS3(this, prefix + '-contact-evaluations-bucket', {
        prefix: prefix,
        encryptionKey: foundationEncryptionKey,
        bucketName: prefix + '-contact-evaluations-bucket',
      } );
      contactEvaluationsBucketName = contactEvaluationsBucket.bucketName;
      contactEvaluationsBucketInstance = contactEvaluationsBucket.bucket;
      contactEvaluationsBucketInstance.node.addDependency(foundationEncryptionKey);
    }
    
    // Use the new AwsCustomResource-based construct for contact evaluations
    const contactEvaluationsAssociation = new ConnectInstanceS3StorageAssociation(this, prefix + '-contact-evaluations-association', {
      prefix: prefix,
      connectInstanceArn: connectInstance.attrArn,
      connectInstanceServiceRoleArn: connectInstance.attrServiceRole,
      resourceType: 'CONTACT_EVALUATIONS',
      bucket: contactEvaluationsBucketInstance,
      bucketPrefix: 'contact-evaluations',
      key: foundationEncryptionKey,
    });
    
    // Ensure the storage config is created after the instance
    contactEvaluationsAssociation.customResource.node.addDependency(scheduledReportsInstanceStorageConfig);
    contactEvaluationsAssociation.customResource.node.addDependency(connectInstance);
    contactEvaluationsAssociation.customResource.node.addDependency(contactEvaluationsBucketInstance);
    contactEvaluationsAssociation.customResource.node.addDependency(kmsKey);
    
    this.createOutput('ContactEvaluationsBucketName', contactEvaluationsBucketName, 'string', true);
    this.createOutput('ContactEvaluationsBucketArn', `arn:aws:s3:::${contactEvaluationsBucketName}`, 'arn', true);
    this.createOutput('ContactEvaluationsBucketPrefix', 'contact-evaluations', 'string', true);

  /*
    Configure kinesis stream association for real time contact analysis voice segments
    */
    let realTimeContactAnalysisVoiceSegmentsStreamName = "";
    if( this.props.enableRealTimeContactAnalysisVoiceSegmentsStream ) {
      realTimeContactAnalysisVoiceSegmentsStreamName = prefix + '-real-time-contact-analysis-voice-segments-stream';
      const realTimeContactAnalysisVoiceSegmentsStream = new WdkKinesisStream(this, prefix + '-real-time-contact-analysis-voice-segments-stream', {
        prefix: prefix,
        streamName: realTimeContactAnalysisVoiceSegmentsStreamName,
        encryptionKey: foundationEncryptionKey,
      } );

      // Use new AwsCustomResource-based construct for real-time analysis voice segments
      const realTimeContactAnalysisVoiceSegmentsStreamAssociation = new ConnectInstanceKinesisStreamAssociation(this, prefix + '-real-time-contact-analysis-voice-segments-stream-association', {
        prefix: prefix,
        connectInstanceArn: connectInstance.attrArn,
        connectInstanceServiceRoleArn: connectInstance.attrServiceRole,
        resourceType: 'REAL_TIME_CONTACT_ANALYSIS_VOICE_SEGMENTS',
        stream: realTimeContactAnalysisVoiceSegmentsStream.stream,
      });

      realTimeContactAnalysisVoiceSegmentsStream.stream.grantReadWrite(realTimeContactAnalysisVoiceSegmentsStreamAssociation.customResource);
      
      // Ensure the storage config is created after the instance
      realTimeContactAnalysisVoiceSegmentsStreamAssociation.customResource.node.addDependency(realTimeContactAnalysisVoiceSegmentsStream.stream);
      realTimeContactAnalysisVoiceSegmentsStreamAssociation.customResource.node.addDependency(connectInstance);
    }
    this.createOutput('RealTimeContactAnalysisVoiceSegmentsStreamEnabled', this.props.enableRealTimeContactAnalysisVoiceSegmentsStream ? 'true' : 'false', 'string', true);
    this.createOutput('RealTimeContactAnalysisVoiceSegmentsStreamName', realTimeContactAnalysisVoiceSegmentsStreamName, 'string', true);

    /*
    Configure kinesis stream association for real time contact analysis text segments
    */
    let realTimeContactAnalysisTextSegmentsStreamName = "";
    if( this.props.enableRealTimeContactAnalysisChatSegmentsStream ) {
      realTimeContactAnalysisTextSegmentsStreamName = prefix + '-real-time-contact-analysis-text-segments-stream';
      const realTimeContactAnalysisTextSegmentsStream = new WdkKinesisStream(this, prefix + '-real-time-contact-analysis-text-segments-stream', {
        prefix: prefix,
        streamName: realTimeContactAnalysisTextSegmentsStreamName,
        encryptionKey: foundationEncryptionKey,
      } );
   
      // Use new AwsCustomResource-based construct for real-time analysis chat segments
      const realTimeContactAnalysisTextSegmentsStreamAssociation = new ConnectInstanceKinesisStreamAssociation(this, prefix + '-real-time-contact-analysis-text-segments-stream-association', {
        prefix: prefix,
        connectInstanceArn: connectInstance.attrArn,
        connectInstanceServiceRoleArn: connectInstance.attrServiceRole,
        resourceType: 'REAL_TIME_CONTACT_ANALYSIS_CHAT_SEGMENTS',
        stream: realTimeContactAnalysisTextSegmentsStream.stream,
      });
      
      realTimeContactAnalysisTextSegmentsStream.stream.grantReadWrite(realTimeContactAnalysisTextSegmentsStreamAssociation.customResource);

      // Ensure the storage config is created after the instance
      realTimeContactAnalysisTextSegmentsStreamAssociation.customResource.node.addDependency(realTimeContactAnalysisTextSegmentsStream.stream);
      realTimeContactAnalysisTextSegmentsStreamAssociation.customResource.node.addDependency(connectInstance);
    }
    this.createOutput('RealTimeContactAnalysisTextSegmentsStreamEnabled', this.props.enableRealTimeContactAnalysisChatSegmentsStream ? 'true' : 'false', 'string', true);
    this.createOutput('RealTimeContactAnalysisTextSegmentsStreamName', realTimeContactAnalysisTextSegmentsStreamName, 'string', true);

    const automatedInteractionLogAttribute = new AwsCustomResource(this, prefix + "-automated-interaction-log-attribute", {
      onCreate: {
        service: "Connect",
        action: "UpdateInstanceAttribute",
        parameters: {
          InstanceId: connectInstance.attrArn,
          AttributeType: "AUTOMATED_INTERACTION_LOG",
          Value: "true",
        },
        physicalResourceId: PhysicalResourceId.of("id"),
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["connect:UpdateInstanceAttribute"],
          resources: [connectInstance.attrArn],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["iam:PutRolePolicy"],
          resources: [connectInstance.attrServiceRole],
        }),
      ]),
    });

    const enabledBotAnalyticsTranscriptsAttribute = new AwsCustomResource(this, prefix + "-enabled-bot-analytics-transcripts-attribute", {
      onCreate: {
        service: "Connect",
        action: "UpdateInstanceAttribute",
        parameters: {
          InstanceId: connectInstance.attrArn,
          AttributeType: "ENABLE_BOT_ANALYTICS_AND_TRANSCRIPTS",
          Value: "true",
        },
        physicalResourceId: PhysicalResourceId.of("id"),
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["connect:UpdateInstanceAttribute"],
          resources: [connectInstance.attrArn],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["iam:PutRolePolicy"],
          resources: [connectInstance.attrServiceRole],
        }),
      ]),
    });

    const botManagementAttribute = new AwsCustomResource(this, prefix + "-bot-management-attribute", {
      onCreate: {
        service: "Connect",
        action: "UpdateInstanceAttribute",
        parameters: {
          InstanceId: connectInstance.attrArn,
          AttributeType: "BOT_MANAGEMENT",
          Value: "true",
        },
        physicalResourceId: PhysicalResourceId.of("id"),
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["connect:UpdateInstanceAttribute"],
          resources: [connectInstance.attrArn],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["iam:PutRolePolicy"],
          resources: [connectInstance.attrServiceRole],
        }),
      ]),
    });
  }
}