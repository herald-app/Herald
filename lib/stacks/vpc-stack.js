const { Stack } = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const cwLogs = require('aws-cdk-lib/aws-logs');
const servicediscovery = require("aws-cdk-lib/aws-servicediscovery");

class VPCStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const logs = new cwLogs.LogGroup(this, 'Logs', {
      logGroupName: '/aws/vpc/flowlogs',
    });

    this.vpc = new ec2.Vpc(this, "VPC", {
      maxAzs: 3,
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
      flowLogs: {
        's3': {
          destination: ec2.FlowLogDestination.toCloudWatchLogs(logs),
          trafficType: ec2.FlowLogTrafficType.ALL,
        },
      },
    });

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
