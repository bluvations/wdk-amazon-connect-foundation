# AmazonConnectFoundation Module

A fully featured, foundational connect instance

## Configuration

This module is part of the WDK (Wizard Development Kit) system.

### Required Inputs

None

### Outputs

Define outputs in the `initialize()` method by passing them to the constructor:

```typescript
outputs: [
  { propertyName: 'exampleOutput', value: 'some-value', type: 'string' }
]
```

## Deployment

To deploy this module:

```bash
cd amazon-connect-foundation
cdk deploy --context prefixName=<prefix> --context stageName=<stage> --context accountNumber=<account> --context region=<region>
```

## Development

Edit `amazon-connect-foundation-stack.ts` to add your CDK resources.

The `initialize()` method is where you define your infrastructure.

### Reading Config from Other Stacks

```typescript
const someValue = this.getInput('stackName', 'propertyName');
```

### Writing Outputs

Pass outputs in the constructor props:

```typescript
outputs: [
  { propertyName: 'myOutput', value: resource.arn, type: 'arn' }
]
```
