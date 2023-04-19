const { NestedStack } = require("aws-cdk-lib");
const { ESData } = require("../constructs/es-data-construct");

class ESDataNestedStack extends NestedStack {
  constructor(scope, id, NestedStackProps) {
    super(scope, id, NestedStackProps);

    this.stack = new ESData(this, `ES01`, {
      bastionSg: NestedStackProps.bastionSg,
      securityGroup: NestedStackProps.securityGroup,
      vpc: NestedStackProps.vpc,
      cluster: NestedStackProps.cluster,
      namespace: NestedStackProps.namespace,
      setupServer: NestedStackProps.setupServer,
      certsFileSystem: NestedStackProps.certsFileSystem,
      certsVolume: NestedStackProps.certsVolume,
    });
  }
}

module.exports = { ESDataNestedStack };

// comments