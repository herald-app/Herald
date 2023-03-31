const { NestedStack } = require("aws-cdk-lib");
const { Elasticsearch } = require("../constructs/elasticsearch-construct");

class ElasticsearchStack extends NestedStack {
  constructor(scope, id, NestedStackProps) {
    super(scope, id, NestedStackProps);

    this.stack = new Elasticsearch(this, `ES01`, {
      bastionSg: NestedStackProps.bastionSg,
      securityGroup: NestedStackProps.securityGroup,
      nodeName: NestedStackProps.nodeName,
      vpc: NestedStackProps.vpc,
      cluster: NestedStackProps.cluster,
      namespace: NestedStackProps.namespace,
      setupServer: NestedStackProps.setupServer,
      certsFileSystem: NestedStackProps.certsFileSystem,
      certsVolume: NestedStackProps.certsVolume,
      dataFileSystem: NestedStackProps.dataFileSystem,
      dataVolume: NestedStackProps.dataVolume,
      clusterInitialMasterNodes: NestedStackProps.clusterInitialMasterNodes,
      discoverySeedHosts: NestedStackProps.discoverySeedHosts,
    });
  }
}

module.exports = { ElasticsearchStack };
