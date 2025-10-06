// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining the website infra.
import * as Constructs from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as constants from '../constants';
import * as CloudFront from 'aws-cdk-lib/aws-cloudfront';
import * as IAM from 'aws-cdk-lib/aws-iam';
import * as CloudFrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import { getRemovalPolicy } from '../resource';
import Bucket from '../s3.bucket';
import Env from '../env';
import { getContentSecurityPolicy } from './content-security-policy';
import { ThreeDProductVisualizationGameLiftStreamsFrontendWAFStackCfnExports } from '../cfn-stacks/frontend.waf';
import TSLambdaFunction from '../lambda.fn';

export default class ThreeDProductVisualizationGameLiftStreamsWebsiteAndCDN extends Constructs.Construct {
  readonly cloudFrontDistributionAccessLogsBucket: Bucket;
  readonly websiteBucket: Bucket;
  readonly cloudFrontDistribution: CloudFront.Distribution;

  constructor(scope: Constructs.Construct, id: string, props: Props) {
    super(scope, id);

    this.cloudFrontDistributionAccessLogsBucket = new Bucket(this, 'access-logs', {
      removalPolicy: getRemovalPolicy(props.stage)
    });

    this.websiteBucket = new Bucket(this, 'website', {
      removalPolicy: getRemovalPolicy(props.stage),
      serverAccessLogsBucket: this.cloudFrontDistributionAccessLogsBucket
    });

    const websiteS3Origin = CloudFrontOrigins.S3BucketOrigin.withOriginAccessControl(this.websiteBucket.bucket);

    const contentSecurityPolicy = getContentSecurityPolicy(['https://*.awswaf.com']); // See: https://docs.aws.amazon.com/waf/latest/developerguide/waf-javascript-api-csp.html

    const responseHeadersPolicy = new CloudFront.ResponseHeadersPolicy(this, 'response-headers-policy', {
      corsBehavior: {
        // FIXME Validate this config isn't too exposed.
        accessControlAllowCredentials: false,
        accessControlAllowHeaders: ['*'],
        accessControlAllowMethods: ['GET', 'POST', 'HEAD','OPTIONS'],
        accessControlAllowOrigins: ['*'],
        accessControlExposeHeaders: ['*'],
        accessControlMaxAge: cdk.Duration.minutes(10),
        originOverride: true
      },
      customHeadersBehavior: {
        customHeaders: [
          { header: 'Permissions-Policy', value: 'fullscreen=(self)', override: true }
        ],
      },
      securityHeadersBehavior: {
        contentSecurityPolicy: { contentSecurityPolicy, override: true },
        frameOptions: { frameOption: CloudFront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: CloudFront.HeadersReferrerPolicy.NO_REFERRER, override: true },
        strictTransportSecurity: { accessControlMaxAge: cdk.Duration.minutes(10), includeSubdomains: true, override: true },
        xssProtection: { protection: true, modeBlock: true, override: true }
      }
    });

    const frontendWAFStackCfnExports = new ThreeDProductVisualizationGameLiftStreamsFrontendWAFStackCfnExports(this, 'frontend-waf-cfn-exports', props);
    const wafAclAttrArn = frontendWAFStackCfnExports.wafAclAttrArn;

    let streamSessionMiddlewareFunction: TSLambdaFunction | undefined;
    if (!props.destroy) {
      streamSessionMiddlewareFunction = new TSLambdaFunction(this, 'stream-session-middleware-fn', {
        ...props,
        functionType: 'edge',
        functionName: props.stage.getResourceName({ resourceName: 'stream-session-middleware' }),
        code: props.edgeDistDir,
        cmd: `infra_aws_bundle_importified.onResourceRequest`,
        /* @edge functions don't support env variables. The deploy/frontend step in the makefile.aws file handles adding them to the bundled source code.
        environment: {
          aws_gls_stream_group_id: backendStackCfnExports.glsStreamGroupId,
          aws_gls_application_group_id: backendStackCfnExports.glsApplicationId
        },
        */
        exclude: ['node_modules'] // FIXME Should have been cleaned up by "make package/edge" ?
      });

      if (props.appFilesUploaded && props.glsStreamGroupId && props.glsApplicationId) {
        streamSessionMiddlewareFunction.function.addToRolePolicy(new IAM.PolicyStatement({
          actions: ['gameliftstreams:StartStreamSession', 'gameliftstreams:GetStreamSession'],
          resources: [props.glsStreamGroupId, props.glsApplicationId]
        }));
      }
    }

    this.cloudFrontDistribution = new CloudFront.Distribution(this, 'cloudfront-distribution', {
      webAclId: wafAclAttrArn,
      priceClass: CloudFront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: { // Cache all static files.
        origin: websiteS3Origin,
        viewerProtocolPolicy: CloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: CloudFront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: CloudFront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy,
      },
      additionalBehaviors: {
        '/api/*': { // Only invoke edge function when requesting URIs prefixed with /api.
          origin: websiteS3Origin, // TODO Not really used, any reason to not use existing origin?
          edgeLambdas: props.destroy ? undefined : [
            {
              functionVersion: streamSessionMiddlewareFunction!.function.currentVersion,
              eventType: CloudFront.LambdaEdgeEventType.VIEWER_REQUEST,
              includeBody: true
            }
          ],
          viewerProtocolPolicy: CloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: CloudFront.AllowedMethods.ALLOW_ALL,
          cachePolicy: CloudFront.CachePolicy.CACHING_DISABLED,
          responseHeadersPolicy
        }
      },
      defaultRootObject: 'index.html',
      errorResponses: [{
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/404.html'
      }],
      enableLogging: true,
      logBucket: this.cloudFrontDistributionAccessLogsBucket.bucket,
      logFilePrefix: 'distribution-access-logs/',
      logIncludesCookies: true
    });
  }
}

interface Props extends constants.CommonProps {
  readonly appFilesUploaded: boolean;
  readonly env: Env;
  readonly destroy: boolean;
  readonly edgeDistDir: string;
  readonly glsStreamGroupId?: string;
  readonly glsApplicationId?: string;
}