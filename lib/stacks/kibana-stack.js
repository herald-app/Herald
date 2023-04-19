const { Stack } = require("aws-cdk-lib");
const ecs = require("aws-cdk-lib/aws-ecs");
const { Kibana } = require("../constructs/kibana-construct");

class KibanaStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, "Kibana-Cluster", {
      vpc: props.vpc,
      name: "kibana-cluster",
    });

    new Kibana(this, "Kibana-Instance", {
      bastionSg: props.bastionSg,
      cluster,
      namespace: props.namespace,
      es01: props.es01,
      certsFileSystem: props.certsFileSystem,
      certsVolume: props.certsVolume,
      dataFileSystem: props.dataFileSystem,
      dataVolume: props.dataVolume,
    });
  }
}

module.exports = { KibanaStack };
