const { Stage } = require("aws-cdk-lib");
const { IamStack } = require("./stacks/iam-stack");
const { VPCStack } = require("./stacks/vpc-stack");
const { VolumesStack } = require("./stacks/volumes-stack");
const { SetupStack } = require("./stacks/setup-stack");
const { ElasticsearchStack } = require("./stacks/elasticsearch-stack");
const { SetupLambdaStack } = require("./stacks/setup-lambda-stack");
const { KibanaStack } = require("./stacks/kibana-stack");
const { LogstashStack } = require("./stacks/logstash-stack");
const { FleetServerStack } = require("./stacks/fleetserver-stack");
const { BastionHostStack } = require("./stacks/bastion-host-stack");

class HeraldAppStage extends Stage {
  constructor(scope, id, props) {
    super(scope, id, props);

    const iam = new IamStack(scope, "IAMStack");
    const vpc = new VPCStack(scope, "VPCStack", {
      env: props.env,
    });

    const volumes = new VolumesStack(scope, "VolumesStack", {
      vpc: vpc.vpc,
    });

    const setup = new SetupStack(scope, "SetupStack", {
      vpc: vpc.vpc,
      bastionSg: vpc.bastionSg,
      iam,
      namespace: vpc.namespace,
      certsFileSystem: volumes.certsFileSystem,
      certsVolume: volumes.certsVolume,
    });

    const elasticsearch = new ElasticsearchStack(scope, "ElasticsearchStack", {
      vpc: vpc.vpc,
      bastionSg: vpc.bastionSg,
      iam,
      namespace: vpc.namespace,
      setupServer: setup.stack.instance,
      certsFileSystem: volumes.certsFileSystem,
      certsVolume: volumes.certsVolume,
    });
    elasticsearch.addDependency(setup);

    const setupLambda = new SetupLambdaStack(scope, "SetupLambdaStack", {
      iam,
      setupServer: setup.stack.instance,
    });
    setupLambda.addDependency(elasticsearch);

    const logstash = new LogstashStack(scope, "LogstashStack", {
      vpc: vpc.vpc,
      bastionSg: vpc.bastionSg,
      iam,
      namespace: vpc.namespace,
      es01: elasticsearch.es01.stack.instance,
      certsFileSystem: volumes.certsFileSystem,
      certsVolume: volumes.certsVolume,
    });
    logstash.addDependency(elasticsearch);

    const kibana = new KibanaStack(scope, "KibanaStack", {
      vpc: vpc.vpc,
      bastionSg: vpc.bastionSg,
      iam,
      namespace: vpc.namespace,
      es01: elasticsearch.es01.stack.instance,
      certsFileSystem: volumes.certsFileSystem,
      certsVolume: volumes.certsVolume,
    });
    kibana.addDependency(elasticsearch);

    const fleetServer = new FleetServerStack(scope, "FleetServerStack", {
      vpc: vpc.vpc,
      bastionSg: vpc.bastionSg,
      iam,
      namespace: vpc.namespace,
      es01: elasticsearch.es01.stack.instance,
      certsFileSystem: volumes.certsFileSystem,
      certsVolume: volumes.certsVolume,
    });
    fleetServer.addDependency(kibana);

    new BastionHostStack(scope, "BastionHostStack", {
      vpc: vpc.vpc,
      bastionSg: vpc.bastionSg,
    });
  }
}

module.exports = { HeraldAppStage };
