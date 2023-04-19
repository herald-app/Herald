const { NestedStack } = require("aws-cdk-lib");
const { ESMaster } = require("../constructs/es-master-construct");

class ESMasterNestedStack extends NestedStack {
  constructor(scope, id, NestedStackProps) {
    super(scope, id, NestedStackProps);

    this.stack = new ESMaster(this, `ES01`, {
      bastionSg: NestedStackProps.bastionSg,
      securityGroup: NestedStackProps.securityGroup,
      nodeName: NestedStackProps.nodeName,
      vpc: NestedStackProps.vpc,
      cluster: NestedStackProps.cluster,
      namespace: NestedStackProps.namespace,
      setupServer: NestedStackProps.setupServer,
      certsFileSystem: NestedStackProps.certsFileSystem,
      certsVolume: NestedStackProps.certsVolume,
      clusterInitialMasterNodes: NestedStackProps.clusterInitialMasterNodes,
      discoverySeedHosts: NestedStackProps.discoverySeedHosts,
    });
  }
}

module.exports = { ESMasterNestedStack };

// comments