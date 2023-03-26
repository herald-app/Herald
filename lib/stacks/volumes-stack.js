const { RemovalPolicy, Stack } = require("aws-cdk-lib");
const efs = require("aws-cdk-lib/aws-efs");
const ec2 = require("aws-cdk-lib/aws-ec2");
const { Volume } = require("../constructs/volume-construct");

class VolumesStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const es01FileSystem = new efs.FileSystem(this, "ES01-FileSystem", {
      vpc: props.vpc,
      fileSystemName: "es01FileSystem",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const es01DataVolume = new Volume(this, "ES01-Data-Volume", {
      volumeName: "es01DataVolume",
      fileSystemId: es01FileSystem.fileSystemId,
    }).volume;

    const es02FileSystem = new efs.FileSystem(this, "ES02-FileSystem", {
      vpc: props.vpc,
      fileSystemName: "es02FileSystem",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const es02DataVolume = new Volume(this, "ES02-Data-Volume", {
      volumeName: "es02DataVolume",
      fileSystemId: es02FileSystem.fileSystemId,
    }).volume;

    const es03FileSystem = new efs.FileSystem(this, "ES03-FileSystem", {
      vpc: props.vpc,
      fileSystemName: "es03FileSystem",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const es03DataVolume = new Volume(this, "ES03-Data-Volume", {
      volumeName: "es03DataVolume",
      fileSystemId: es03FileSystem.fileSystemId,
    }).volume;

    this.esFileSystems = {
      es01: es01FileSystem,
      es02: es02FileSystem,
      es03: es03FileSystem,
    };

    this.esDataVolumes = {
      es01: es01DataVolume,
      es02: es02DataVolume,
      es03: es03DataVolume,
    };

    this.certsFileSystem = new efs.FileSystem(this, "Certs-FileSystem", {
      vpc: props.vpc,
      fileSystemName: "certsFileSystem",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.certsVolume = new Volume(this, "Certs-Volume", {
      volumeName: "certsVolume",
      fileSystemId: this.certsFileSystem.fileSystemId,
    }).volume;

    this.kibanaFileSystem = new efs.FileSystem(this, "Kibana-FileSystem", {
      vpc: props.vpc,
      fileSystemName: "kibanaFileSystem",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.kibanaDataVolume = new Volume(this, "Kibana-Data-Volume", {
      volumeName: "kibanaDataVolume",
      fileSystemId: this.kibanaFileSystem.fileSystemId,
    }).volume;
  }
}

module.exports = { VolumesStack };
