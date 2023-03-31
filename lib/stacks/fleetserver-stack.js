const { Stack } = require("aws-cdk-lib");
const ecs = require("aws-cdk-lib/aws-ecs");
const ec2 = require("aws-cdk-lib/aws-ec2");
const { FleetServer } = require("../constructs/fleetserver-construct");

class FleetServerStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, "FleetServer", {
      vpc: props.vpc,
      name: "fleet-server",
    });

    const asg = cluster.addCapacity("DefaultAutoScalingGroup", {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MEDIUM
      ),
      desiredCapacity: 1,
      keyName: "herald-key",
    });

    asg.role.attachInlinePolicy(props.iam.ec2PolicySsm);
    asg.role.attachInlinePolicy(props.iam.ec2PolicyEfs);
    asg.role.attachInlinePolicy(props.iam.ecsPolicyExec);

    this.stack = new FleetServer(this, "Fleet-Server", {
      bastionSg: props.bastionSg,
      namespace: props.namespace,
      cluster,
      nodeName: "fleet-server",
      es01: props.es01,
      certsFileSystem: props.certsFileSystem,
      certsVolume: props.certsVolume,
    });
  }
}


module.exports = { FleetServerStack };
