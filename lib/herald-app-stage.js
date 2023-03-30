const { Stage } = require("aws-cdk-lib");
const { IamStack } = require("./stacks/iam-stack");
const { VPCStack } = require("./stacks/vpc-stack");
const { VolumesStack } = require("./stacks/volumes-stack");
const { SetupStack } = require("./stacks/setup-stack");
const { ESClusterStack } = require("./stacks/es-cluster-stack");
const { SetupLambdaStack } = require("./stacks/setup-lambda-stack");
const { KibanaStack } = require("./stacks/kibana-stack");
const { LogstashStack } = require("./stacks/logstash-stack");
const { FleetServerStack } = require("./stacks/fleetserver-stack");

class HeraldAppStage extends Stage {
  constructor(scope, id, props) {
    super(scope, id, props);

    const iam = new IamStack(scope, "IAMStack");
    const vpc = new VPCStack(scope, "VPCStack");

    const volumes = new VolumesStack(scope, "VolumesStack", {
      vpc: vpc.vpc,
      securityGroup: vpc.servicesSg,
    });

    const setup = new SetupStack(scope, "SetupStack", {
      vpc: vpc.vpc,
      securityGroup: vpc.servicesSg,
      iam,
      namespace: vpc.namespace,
      certsFileSystem: volumes.certsFileSystem,
      certsVolume: volumes.certsVolume,
    });

    const initialEsCluster = new ESClusterStack(scope, "ESClusterStack", {
      vpc: vpc.vpc,
      iam,
      namespace: vpc.namespace,
      setupServer: setup.stack.instance,
      certsFileSystem: volumes.certsFileSystem,
      certsVolume: volumes.certsVolume,
      dataFileSystems: volumes.esFileSystems,
      dataVolumes: volumes.esDataVolumes,
    });

    const setupLambda = new SetupLambdaStack(scope, "SetupLambdaStack", {
      iam,
      setupServer: setup.stack.instance,
    });
    setupLambda.addDependency(initialEsCluster);

    const logstash = new LogstashStack(scope, "LogstashStack", {
      vpc: vpc.vpc,
      iam,
      namespace: vpc.namespace,
      es01: initialEsCluster.es01.stack.instance,
      certsFileSystem: volumes.certsFileSystem,
      certsVolume: volumes.certsVolume,
    });
    logstash.addDependency(initialEsCluster);

    const kibana = new KibanaStack(scope, "KibanaStack", {
      vpc: vpc.vpc,
      iam,
      namespace: vpc.namespace,
      es01: initialEsCluster.es01.stack.instance,
      certsFileSystem: volumes.certsFileSystem,
      certsVolume: volumes.certsVolume,
      dataFileSystem: volumes.kibanaFileSystem,
      dataVolume: volumes.kibanaDataVolume,
    });
    kibana.addDependency(initialEsCluster);

    const fleetServer = new FleetServerStack(scope, "FleetServerStack", {
      vpc: vpc.vpc,
      iam,
      namespace: vpc.namespace,
      es01: initialEsCluster.es01.stack.instance,
      certsFileSystem: volumes.certsFileSystem,
      certsVolume: volumes.certsVolume,
    });
    fleetServer.addDependency(kibana);
  }
}

module.exports = { HeraldAppStage };
