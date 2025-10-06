// This file is responsible for defining our locally-hosted edge function.
import { onResourceRequest } from '../../dist.edge/infra_aws_bundle_importified.mjs';

export default class LocalAWSLambdaEdgeMiddleware {
  middleware (config) {
    console.debug('config', config);

    return async (requestContext, next) => {
      console.debug('requestContext', requestContext);

      const uri = requestContext.request.url.indexOf('?') !== -1 ? requestContext.url.split('?')[0] : requestContext.request.url;
      const querystring = requestContext.request.url.indexOf('?') !== -1 ? requestContext.request.url.split('?')[1] : undefined;

      // Call our edge function.
      const updatedRequest = await onResourceRequest({
        Records: [{
          cf: {
            request: {
              method: requestContext.request.method,
              uri,
              body: requestContext.request.body,
              querystring
            }
          }
        }]
      });
      console.debug('updatedRequest', updatedRequest);

      /* FIXME
      if (updatedRequest && updatedRequest.status) {
        requestContext.response.status = updatedRequest.status;
      }
      */

      if (updatedRequest && updatedRequest.body) {
        requestContext.response.body = updatedRequest.body;
      }

      await next();
    }
  }
}