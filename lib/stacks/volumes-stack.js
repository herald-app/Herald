const { RemovalPolicy, Stack } = require("aws-cdk-lib");
const efs = require("aws-cdk-lib/aws-efs");
const ec2 = require("aws-cdk-lib/aws-ec2");
const { Volume } = require("../constructs/volume-construct");

class VolumesStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    this.certsFileSystem = new efs.FileSystem(this, "Certs-FileSystem", {
      vpc: props.vpc,
      fileSystemName: "certsFileSystem",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.certsVolume = new Volume(this, "Certs-Volume", {
      volumeName: "certsVolume",
      fileSystemId: this.certsFileSystem.fileSystemId,
    }).volume;

    this.logstashFileSystem = new efs.FileSystem(this, "Logstash-FileSystem", {
      vpc: props.vpc,
      fileSystemName: "logstashFileSystem",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.logstashVolume = new Volume(this, "Logstash-Volume", {
      volumeName: "logstashVolume",
      fileSystemId: this.logstashFileSystem.fileSystemId,
    }).volume;
  }
}

module.exports = { VolumesStack };
