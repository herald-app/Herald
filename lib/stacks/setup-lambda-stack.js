const { Stack } = require("aws-cdk-lib");
const iam = require("aws-cdk-lib/aws-iam");
const lambda = require("aws-cdk-lib/aws-lambda");
const triggers = require("aws-cdk-lib/triggers");
const path = require("path");

class SetupLambdaStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new triggers.TriggerFunction(this, "SetupLambda", {
      functionName: "SetupLambda",
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../utils/setup-lambda")
      ),
      handler: "index.handler",
      environment: {
        SETUP_SERVICE_NAME: props.setupServer.serviceName,
        SETUP_SERVICE_CLUSTER: props.setupServer.cluster.clusterArn,
      },
      role: props.iam.lambdaRole,
    });
  }
}

module.exports = { SetupLambdaStack };

// comments