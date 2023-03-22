const { RemovalPolicy } = require("aws-cdk-lib");
const { Construct } = require("constructs");
const efs = require("aws-cdk-lib/aws-efs");
const ec2 = require("aws-cdk-lib/aws-ec2");

class DataVolume extends Construct {
  constructor(scope, id, props) {
    super(scope, id, props);

    const dataFileSystem = new efs.FileSystem(
      this,
      `${props.nodeName}-Data-FileSystem`,
      {
        vpc: props.vpc,
        fileSystemName: `${props.nodeName}-data-efs`,
      }
    );

    dataFileSystem.connections.allowFrom(
      props.securityGroup,
      ec2.Port.tcp(2049)
    );
    dataFileSystem.applyRemovalPolicy(RemovalPolicy.DESTROY); // remove for production

    this.volume = {
      name: `${props.nodeName}-data-volume`,
      efsVolumeConfiguration: {
        fileSystemId: dataFileSystem.fileSystemId,
      },
    };
  }
}

module.exports = { DataVolume };
