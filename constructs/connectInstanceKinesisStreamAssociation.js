"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectInstanceKinesisStreamAssociation = void 0;
const constructs_1 = require("constructs");
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
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
class ConnectInstanceKinesisStreamAssociation extends constructs_1.Construct {
    constructor(scope, id, props) {
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
exports.ConnectInstanceKinesisStreamAssociation = ConnectInstanceKinesisStreamAssociation;
