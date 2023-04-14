const { Stack } = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const servicediscovery = require("aws-cdk-lib/aws-servicediscovery");
const { heraldVpc } = require('../../user-config.json');

class VPCStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    this.vpc;

    if (heraldVpc.id) {
      this.vpc = ec2.Vpc.fromLookup(this, 'VPC', {
        vpcId: heraldVpc.id,
      });
    } else {
      this.vpc = new ec2.Vpc(this, "VPC", {
        maxAzs: 3,
        // enableDnsHostnames: true,
        // enableDnsSupport: true,
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
    }

    this.vpc.dnsHostnamesEnabled = true;
    this.vpc.dnsSupportEnabled = true;

    this.namespace = new servicediscovery.PrivateDnsNamespace(
      this,
      "namespace",
      {
        vpc: this.vpc,
        name: "service.local",
      }
    );

    this.bastionSg = new ec2.SecurityGroup(this, "Bastion-SG", {
      vpc: this.vpc,
      allowAllOutbound: true,
    });
  }
}

module.exports = { VPCStack };
