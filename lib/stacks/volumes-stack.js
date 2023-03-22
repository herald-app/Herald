const { RemovalPolicy, Stack } = require("aws-cdk-lib");
const efs = require("aws-cdk-lib/aws-efs");
const ec2 = require("aws-cdk-lib/aws-ec2");
const { CertsVolume } = require("../constructs/certs-volume-construct");
const { DataVolume } = require("../constructs/data-volume-construct");

class VolumesStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    this.certsVolume = new CertsVolume(this, "Certs-Volume", {
      vpc: props.vpc,
      securityGroup: props.securityGroup,
    }).volume;

    this.es01DataVolume = new DataVolume(this, "ES01-Data-Volume", {
      nodeName: "ES01",
      vpc: props.vpc,
      securityGroup: props.securityGroup,
    }).volume;

    this.es02DataVolume = new DataVolume(this, "ES02-Data-Volume", {
      nodeName: "ES02",
      vpc: props.vpc,
      securityGroup: props.securityGroup,
    }).volume;

    this.es03DataVolume = new DataVolume(this, "ES03-Data-Volume", {
      nodeName: "ES03",
      vpc: props.vpc,
      securityGroup: props.securityGroup,
    }).volume;

    this.kibanaDataVolume = new DataVolume(this, "Kibana-Data-Volume", {
      nodeName: "kibana",
      vpc: props.vpc,
      securityGroup: props.securityGroup,
    }).volume;
  }
}

module.exports = { VolumesStack };
