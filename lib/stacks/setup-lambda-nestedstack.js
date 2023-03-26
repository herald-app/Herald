const { NestedStack } = require("aws-cdk-lib");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const lambda = require("aws-cdk-lib/aws-lambda");
const path = require("path");

class SetupLambdaStack extends NestedStack {
  constructor(scope, id, NestedStackProps) {
    super(scope, id, NestedStackProps);

    // const rule = new Rule(this, "Stop Task", {
    //   eventPattern: {
    //     source: ["aws.cloudformation"],
    //     detailType: ["CloudFormation Stack Status Change"],
    //     detail: {
    //       stackId: [NestedStackProps.es01.stackId],
    //       statusDetails: {
    //         status: ["CREATE_COMPLETE"],
    //       },
    //     },
    //   },
    // });

    const lambdaFn = new lambda.Function(this, "Lambda", {
      functionName: "SetupLambda",
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../utils/setup-lambda")
      ),
      handler: "index.handler",
      environment: {
        SETUP_SERVICE_NAME: NestedStackProps.setupServiceName,
      },
    });

    const lambdaClient = new LambdaClient({ region: "us-east-1" });
    const invokeParams = {
      FunctionName: lambdaFn.functionName,
      InvocationType: "Event",
    };
    const command = new InvokeCommand(invokeParams);

    (async () => {
      try {
        await lambdaClient.send(command);
      } catch (err) {
        throw new Error(err);
      }
    })();
  }
}

module.exports = { SetupLambdaStack };
