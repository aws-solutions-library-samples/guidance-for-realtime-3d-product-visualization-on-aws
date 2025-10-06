// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining the frontend WAF AWS infra stack.
// References:
// * https://gist.github.com/matheushent/1c5a02bac6397209f2fe41c0ab3567a3
import * as cdk from 'aws-cdk-lib';
import * as constants from '../constants';
import * as Constructs from 'constructs';
import * as WAFV2 from 'aws-cdk-lib/aws-wafv2';
import * as LOGS from 'aws-cdk-lib/aws-logs';
//import * as SSM from 'aws-cdk-lib/aws-ssm';

export class ThreeDProductVisualizationGameLiftStreamsFrontendWAFStack extends cdk.Stack {
  readonly exported?: CfnExports;

  private rules: cdk.aws_wafv2.CfnWebACL.RuleProperty[] = [
    // This provides protection against exploitation of a wide range of vulnerabilities, 
    //  including some of the high risk and commonly occurring vulnerabilities described in OWASP publications such as OWASP Top 10. 
    {
      priority: 0,
      overrideAction: { count: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWS-AWSManagedRulesCommonRuleSet'
      },
      name: 'AWS-AWSManagedRulesCommonRuleSet',
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet'
        }
      }
    },
    // It is way more complicated than it needs to be to block requests w/o valid WAF tokens. 
    // For details, see: https://docs.aws.amazon.com/waf/latest/developerguide/waf-tokens-block-missing-tokens.html
    //
    // The Bot Control managed rule group provides rules that manage requests from bots.
    // More importantly, this rule group uses AWS WAF token management to inspect and label web requests 
    //  according to the status of their AWS WAF tokens. AWS WAF uses tokens for client session tracking and verification. 
    // The dynamic URLs should be protected, i.e. a captcha test will needed to have been passed by visitors,
    //  and the token from a successful test will needed to be included in the request URL in order
    //  for AWS WAF to allow the request to succeed.
    // It's cheaper to use this then to stream the product visualizer willy-nilly.
    {
      priority: 1,
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWS-AWSManagedRulesBotControlRuleSet'
      },
      overrideAction: { count: {} },
      name: 'AWS-AWSManagedRulesBotControlRuleSet',
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesBotControlRuleSet'
        }
      }
    }
  ];

  constructor(scope: cdk.App, id: string, props: Props) {
    super(scope, id, props.stage.stackProps);

    let priorityIndex = 2;

    // With the Bot Control and ATP rule groups, it's possible for a request without a valid token to exit the rule group evaluation 
    //  and continue to be evaluated by the protection pack or web ACL.
    // To block all requests that are missing their token or whose token is rejected, 
    //  add a rule to run immediately after the managed rule group to capture and block requests that the rule group doesn't handle for you.
    this.rules.push({
      priority: priorityIndex,
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: props.stage.getResourceName({ resourceName: 'require-waf-tokens' })
      },
      action: { block: { customResponse: { responseCode: 401, customResponseBodyKey: 'restricted' }} },
      name: props.stage.getResourceName({ resourceName: 'require-waf-tokens' }),
      statement: {
        andStatement: {
          statements: [
            {
              labelMatchStatement: {
                scope: 'LABEL',
                key: 'awswaf:managed:token:absent'
              }
            },
            {
              byteMatchStatement: {
                searchString: '/api/',
                fieldToMatch: {
                  uriPath: {}
                },
                positionalConstraint: 'STARTS_WITH',
                textTransformations: [
                  {
                    priority: 0,
                    type: 'NONE'
                  }
                ]
              }
            },
          ]
        }
      }
    });
    priorityIndex = priorityIndex + 1;

    // IP restriction in place for sample.
    // FIXME If the AWS CDK looks this up, it errors with ValidationFailed. No idea why!
    // Just doing the lookup ourselves and passing the information in.
    //const restrictToPublicIp = SSM.StringParameter.valueForStringParameter(this, `/${props.stage.getConfig().cfnPrefix}/${props.stage.name}/restrict-to-public-ip/${props.stage.getConfig().deployID}`); 

    const ipSetRestrictions = new WAFV2.CfnIPSet(this, 'ip-set', {
      addresses: [`${props.restrictToPublicIp}/32`],
      ipAddressVersion: 'IPV4',
      scope: 'CLOUDFRONT',
      name: props.stage.getResourceName({ resourceName: 'ip-set' })
    });

    // Frontend should only be allowed to be viewed if the public IP matches sample user.
    // Remove or modify at your discretion.
    this.rules.push({
      name: props.stage.getResourceName({ resourceName: 'allow-ip' }),
      priority: priorityIndex,
      statement: {
        ipSetReferenceStatement: {
          arn: ipSetRestrictions.attrArn
        }
      },
      action: { allow: {} },
      visibilityConfig: {
        sampledRequestsEnabled: false,
        cloudWatchMetricsEnabled: false,
        metricName: props.stage.getResourceName({ resourceName: 'allow-ip' }),
      }
    });
    priorityIndex = priorityIndex + 1;

    // Frontend should only be allowed to start a minimum number of sessions per window.
    this.rules.push({
      name: props.stage.getResourceName({ resourceName: 'rate-limit-start' }),
      priority: priorityIndex,
      action: { block: { customResponse: { responseCode: 429, customResponseBodyKey: 'rate-limited' }} },
      statement: {
        rateBasedStatement: {
          aggregateKeyType: 'IP',
          limit: 10, // Can't limit to less than this: WAF limitation.
          evaluationWindowSec: 60,
          scopeDownStatement: {
            byteMatchStatement: {
              searchString: '/api/start-stream-session.json',
              fieldToMatch: {
                uriPath: {},
              },
              positionalConstraint: 'STARTS_WITH',
              textTransformations: [
                {
                  priority: 0,
                  type: 'NONE',
                },
              ]
            }
          }
        }
      },
      visibilityConfig: {
        sampledRequestsEnabled: false,
        cloudWatchMetricsEnabled: false,
        metricName: props.stage.getResourceName({ resourceName: 'rate-limit-start' }),
      }
    });
    priorityIndex = priorityIndex + 1;

    // Frontend polls every 5 seconds when waiting for a session to start, don't allow too much more.
    this.rules.push({
      name: props.stage.getResourceName({ resourceName: 'rate-limit-get' }),
      priority: priorityIndex,
      action: { block: { customResponse: { responseCode: 429, customResponseBodyKey: 'rate-limited' }} },
      statement: {
        rateBasedStatement: {
          aggregateKeyType: 'IP',
          limit: 12,
          evaluationWindowSec: 60,
          scopeDownStatement: {
            byteMatchStatement: {
              searchString: '/api/get-stream-session.json',
              fieldToMatch: {
                uriPath: {}
              },
              positionalConstraint: 'STARTS_WITH',
              textTransformations: [
                {
                  priority: 0,
                  type: 'NONE'
                }
              ],
            }
          }
        }
      },
      visibilityConfig: {
        sampledRequestsEnabled: false,
        cloudWatchMetricsEnabled: false,
        metricName: props.stage.getResourceName({ resourceName: 'rate-limit-get' }),
      }
    });
    priorityIndex = priorityIndex + 1;

    const webAcl = new WAFV2.CfnWebACL(this, 'web-acl', {
      customResponseBodies: {
        'restricted': {
          contentType: 'TEXT_PLAIN',
          content: 'nunya'
        },
        'rate-limited': {
          contentType: 'TEXT_PLAIN',
          content: 'bye, felicia'
        }
      },
      name: props.stage.getResourceName({ resourceName: 'web-acl' }),
      defaultAction: { block: { customResponse: { responseCode: 403, customResponseBodyKey: 'restricted' }} },
      rules: this.rules,
      scope: 'CLOUDFRONT',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: false,
        metricName: props.stage.getResourceName({ resourceName: 'waf' })
      }
    });

    const webAclLogGroup = new LOGS.LogGroup(this, 'web-acl-log-group', {
      // See: https://stackoverflow.com/questions/75571030/terraform-error-reason-the-arn-isnt-valid-a-valid-arn-begins-with-arn-and
      logGroupName: `aws-waf-logs-for-${props.stage.getResourceName({ resourceName: 'web-acl' })}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
  
    new WAFV2.CfnLoggingConfiguration(this, 'web-acl-logging-config', {
      logDestinationConfigs: [webAclLogGroup.logGroupArn],
      resourceArn: webAcl.attrArn
    });

    this.exported = {
      ipSetId: new cdk.CfnOutput(this, props.stage.getResourceName({ resourceName: props.stage.getConfig().wafIpSetIdCfnExportNameSuffix }), {
        value: ipSetRestrictions.attrId,
        exportName: props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().wafIpSetIdCfnExportNameSuffix })
      }),
      wafAclAttrArn: new cdk.CfnOutput(this, props.stage.getResourceName({ resourceName: props.stage.getConfig().wafAclAttrArnCfnExportNameSuffix }), {
        value: webAcl.attrArn,
        exportName: props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().wafAclAttrArnCfnExportNameSuffix })
      })
    };
  }
}

interface Props extends constants.CommonProps {
  restrictToPublicIp: string;
}

interface CfnExports {
  readonly ipSetId: cdk.CfnOutput; // Exported so we can manually update.
  readonly wafAclAttrArn: cdk.CfnOutput; // Exported so we can associate with Amazon CloudFront distribution.
}

// Exported values imported in other cdk cfn constructs.
export class ThreeDProductVisualizationGameLiftStreamsFrontendWAFStackCfnExports extends Constructs.Construct {
  readonly wafAclAttrArn: string; // Imported to so we can associate with Amazon CloudFront distribution.

  constructor(scope: Constructs.Construct, id: string, props: CfnExportProps) {
    super(scope, id);
 
    this.wafAclAttrArn = cdk.Fn.importValue(props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().wafAclAttrArnCfnExportNameSuffix })).toString();
  }
}

interface CfnExportProps extends constants.CommonProps {}