const { Stack } = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const servicediscovery = require("aws-cdk-lib/aws-servicediscovery");

class VPCStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "VPC", {
      maxAzs: 2,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          name: "public-subnet",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: "private-subnet",
          subnetType: ec2.SubnetType.PRIVATE,
        },
      ],
    });

    this.namespace = new servicediscovery.PrivateDnsNamespace(
      this,
      "namespace",
      {
        vpc: this.vpc,
        name: "service.local",
      }
    );

    this.servicesSg = new ec2.SecurityGroup(this, "Services-SG", {
      vpc: this.vpc,
      allowAllOutbound: true,
    });
  }
}

module.exports = { VPCStack };
