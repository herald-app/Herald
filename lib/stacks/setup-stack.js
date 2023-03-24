const { Stack } = require("aws-cdk-lib");
const { Policy, PolicyStatement } = require("aws-cdk-lib/aws-iam");
const autoscaling = require("aws-cdk-lib/aws-autoscaling");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const iam = require("aws-cdk-lib/aws-iam");
const { Setup } = require("../constructs/setup-construct");

class SetupStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, "ES-Cluster", {
      vpc: props.vpc,
      name: "es-cluster",
    });

    const asg = cluster.addCapacity("DefaultAutoScalingGroup", {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.LARGE
      ),
      desiredCapacity: 4,
      keyName: "herald-key",
    });

    const commands = [
      `sudo su -c 'echo "vm.max_map_count=262144" >> /etc/sysctl.conf'`,
      `sudo ulimit -n 65535`,
      `sudo sysctl --system`,
    ];

    asg.role.attachInlinePolicy(props.iam.ec2PolicySsm);
    asg.role.attachInlinePolicy(props.iam.ec2PolicyEfs);
    asg.role.attachInlinePolicy(props.iam.ecsPolicyExec);
    asg.connections.allowFromAnyIpv4(ec2.Port.tcp(22));
    asg.connections.allowFromAnyIpv4(ec2.Port.tcp(443));
    asg.addUserData(...commands);

    this.stack = new Setup(this, "Setup-ES-Node", {
      namespace: props.namespace,
      cluster,
      certsFileSystem: props.certsFileSystem,
      certsVolume: props.certsVolume,
    });
  }
}

module.exports = { SetupStack };
