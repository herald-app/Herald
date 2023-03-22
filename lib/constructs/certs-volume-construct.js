const { RemovalPolicy } = require("aws-cdk-lib");
const { Construct } = require("constructs");
const efs = require("aws-cdk-lib/aws-efs");
const ec2 = require("aws-cdk-lib/aws-ec2");

class CertsVolume extends Construct {
  constructor(scope, id, props) {
    super(scope, id, props);

    const certsFileSystem = new efs.FileSystem(this, "Certs-FileSystem", {
      vpc: props.vpc,
      fileSystemName: "certs-efs",
    });

    certsFileSystem.connections.allowFrom(
      props.securityGroup,
      ec2.Port.tcp(2049)
    );
    certsFileSystem.applyRemovalPolicy(RemovalPolicy.DESTROY); // remove for production

    this.volume = {
      name: "certs-volume",
      efsVolumeConfiguration: {
        fileSystemId: certsFileSystem.fileSystemId,
      },
    };
  }
}

module.exports = { CertsVolume };
