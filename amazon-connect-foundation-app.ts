#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AmazonConnectFoundationStack } from './amazon-connect-foundation-stack';
import { loadConfigFromDynamoDB, getConfigTableName } from '../wdk/config-loader';

async function main() {
  const app = new cdk.App();

  // Get configuration from context
  const prefixName = app.node.tryGetContext('prefixName');
  const stageName = app.node.tryGetContext('stageName');
  const accountNumber = app.node.tryGetContext('accountNumber');
  const region = app.node.tryGetContext('region');

  if (!prefixName || !stageName || !accountNumber || !region) {
    throw new Error('Missing required context values. Please provide: prefixName, stageName, accountNumber, region');
  }

  // Parse required inputs from context (comma-separated list)
  const requiredInputsStr = app.node.tryGetContext('requiredInputs');
  const requiredInputs = requiredInputsStr ? requiredInputsStr.split(',').map((s: string) => s.trim()) : [];

  // Parse outputs from context (JSON string)
  const outputsStr = app.node.tryGetContext('outputs');
  const outputs = outputsStr ? JSON.parse(outputsStr) : [];

  // Load configuration from DynamoDB at synthesis time
  const tableName = getConfigTableName(prefixName, stageName);
  const loadedConfig = await loadConfigFromDynamoDB(tableName, requiredInputs, region);

  console.log(`Loaded ${Object.keys(loadedConfig).length} config values from DynamoDB`);
  if (Object.keys(loadedConfig).length > 0) {
    console.log('Config values:', Object.keys(loadedConfig).join(', '));
  }

  const setupStackName = 'amazon-connect-foundation.setup';
  const getSetupBool = (propertyName: string, defaultValue: boolean): boolean => {
    const key = `${setupStackName}.${propertyName}`;
    const raw = (loadedConfig as any)[key];
    if (raw === undefined || raw === null || raw === '') {
      return defaultValue;
    }
    if (typeof raw === 'boolean') {
      return raw;
    }
    const normalized = String(raw).trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
    try {
      return Boolean(JSON.parse(String(raw)));
    } catch {
      return defaultValue;
    }
  };

  new AmazonConnectFoundationStack(app, `wdk-${prefixName}-${stageName}-amazon-connect-foundation`, {
    prefixName,
    stageName,
    moduleName: 'amazon-connect-foundation',
    loadedConfig,
    outputs,
    env: {
      account: accountNumber,
      region,
    },
    description: `WDK AmazonConnectFoundation Module for ${prefixName}-${stageName}`,
    tags: {
      Project: prefixName,
      Stage: stageName,
      Module: 'amazon-connect-foundation',
      ManagedBy: 'WDK',
    },
    // Storage bucket configuration
    separateChatTranscriptsBucket: getSetupBool('separateChatTranscriptsBucket', true),
    separateScheduledReportsBucket: getSetupBool('separateScheduledReportsBucket', true),
    separateAttachmentsBucket: getSetupBool('separateAttachmentsBucket', true),
    separateContactEvaluationsBucket: getSetupBool('separateContactEvaluationsBucket', true),
    separateScreenRecordingsBucket: getSetupBool('separateScreenRecordingsBucket', true),
    separateEmailMessagesBucket: getSetupBool('separateEmailMessagesBucket', true),
    // Stream configuration
    enableCTRStream: getSetupBool('enableCTRStream', true),
    enableAgentEventsStream: getSetupBool('enableAgentEventsStream', true),
    enableRealTimeContactAnalysisChatSegmentsStream: getSetupBool('enableRealTimeContactAnalysisChatSegmentsStream', true),
    enableRealTimeContactAnalysisVoiceSegmentsStream: getSetupBool('enableRealTimeContactAnalysisVoiceSegmentsStream', true),
  });

  app.synth();
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
