const { Stack } = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");

class BastionHostStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const bastionHost = new ec2.Instance(this, "BastionHostEc2", {
      vpc: props.vpc,
      securityGroup: props.bastionSg,
      instanceType: new ec2.InstanceType("t2.small"),
      machineImage: new ec2.GenericLinuxImage({
        "us-east-1": "ami-007855ac798b5175e",
      }),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      keyName: "herald-key",
    });

    // Allow SSH connections from anywhere
    bastionHost.connections.allowFromAnyIpv4(
      ec2.Port.tcp(22),
      "Allow SSH from anywhere"
    );
  }
}

module.exports = { BastionHostStack };
