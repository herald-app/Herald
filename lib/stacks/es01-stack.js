const efs = require("aws-cdk-lib/aws-efs");
const ec2 = require("aws-cdk-lib/aws-ec2");
const { RemovalPolicy } = require("aws-cdk-lib");
const { Stack } = require("aws-cdk-lib");
const { Elasticsearch } = require("../constructs/elasticsearch-construct");

class ES01Stack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new Elasticsearch(this, `ES01`, {
      vpc: props.vpc,
      securityGroup: props.securityGroup,
      namespace: props.namespace,
      cluster: props.cluster,
      certsVolume: props.certsVolume,
      dataVolume: props.dataVolume,
      nodeName: "es01",
      clusterInitialMasterNodes:
        "es01.service.local,es02.service.local,es03.service.local",
      discoverySeedHosts: "es02.service.local,es03.service.local",
    });
  }
}

module.exports = { ES01Stack };
