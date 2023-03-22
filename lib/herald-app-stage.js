const { Stage } = require("aws-cdk-lib");
const { IamStack } = require("./stacks/iam-stack");
const { VPCStack } = require("./stacks/vpc-stack");
const { VolumesStack } = require("./stacks/volumes-stack");
const { SetupStack } = require("./stacks/setup-stack");
const { ES01Stack } = require("./stacks/es01-stack");
const { ES02Stack } = require("./stacks/es02-stack");
const { ES03Stack } = require("./stacks/es03-stack");
const { KibanaStack } = require("./stacks/kibana-stack");

class HeraldAppStage extends Stage {
  constructor(scope, id, props) {
    super(scope, id, props);

    const iam = new IamStack(scope, "IAMStack");

    const vpc = new VPCStack(scope, "VPCStack");

    const volumes = new VolumesStack(scope, "VolumesStack", {
      vpc: vpc.vpc,
      securityGroup: vpc.servicesSg,
    });
    volumes.addDependency(vpc);

    const setup = new SetupStack(scope, "SetupStack", {
      vpc: vpc.vpc,
      securityGroup: vpc.servicesSg,
      iam,
      namespace: vpc.namespace,
      certsVolume: volumes.certsVolume,
    });
    setup.addDependency(volumes);
    setup.addDependency(iam);

    const es01 = new ES01Stack(scope, "ES01Stack", {
      vpc: vpc.vpc,
      cluster: setup.cluster,
      securityGroup: vpc.servicesSg,
      namespace: vpc.namespace,
      certsVolume: volumes.certsVolume,
      dataVolume: volumes.es01DataVolume,
    });
    es01.addDependency(setup);

    const es02 = new ES02Stack(scope, "ES02Stack", {
      vpc: vpc.vpc,
      cluster: setup.cluster,
      securityGroup: vpc.servicesSg,
      namespace: vpc.namespace,
      certsVolume: volumes.certsVolume,
      dataVolume: volumes.es02DataVolume,
    });
    es02.addDependency(es01);

    const es03 = new ES03Stack(scope, "ES03Stack", {
      vpc: vpc.vpc,
      cluster: setup.cluster,
      securityGroup: vpc.servicesSg,
      namespace: vpc.namespace,
      certsVolume: volumes.certsVolume,
      dataVolume: volumes.es03DataVolume,
    });
    es03.addDependency(es02);

    const kibana = new KibanaStack(scope, "KibanaStack", {
      vpc: vpc.vpc,
      securityGroup: vpc.servicesSg,
      namespace: vpc.namespace,
      iam,
      certsVolume: volumes.certsVolume,
      dataVolume: volumes.kibanaDataVolume,
    });
    kibana.addDependency(es03);

    const logstash = new LogstashStack(scope, "LogstashStack", {
      vpc: vpc.vpc,
      securityGroup: vpc.servicesSg,
      namespace: vpc.namespace,
      iam,
      certsVolume: volumes.certsVolume,
    });
  }
}

module.exports = { HeraldAppStage };
