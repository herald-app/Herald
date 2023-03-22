const { Stack } = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const { Logstash } = require("../constructs/logstash-construct");

class LogstashStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, "Logstash-Cluster", {
      vpc: props.vpc,
      name: "logstash-cluster",
    });

    const asg = cluster.addCapacity("DefaultAutoScalingGroup", {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MEDIUM
      ),
      desiredCapacity: 1,
      securityGroup: props.securityGroup,
      keyName: "herald-key",
    });

    asg.role.attachInlinePolicy(props.iam.ec2PolicySsm);
    asg.role.attachInlinePolicy(props.iam.ec2PolicyEfs);
    asg.role.attachInlinePolicy(props.iam.ecsPolicyExec);
    asg.connections.allowFromAnyIpv4(ec2.Port.tcp(22));
    asg.connections.allowFromAnyIpv4(ec2.Port.tcp(443));

    new Logstash(this, `Logstash`, {
      vpc: props.vpc,
      securityGroup: props.securityGroup,
      namespace: props.namespace,
      cluster,
      certsVolume: props.certsVolume,
      nodeName: "logstash",
    });
  }
}

module.exports = { LogstashStack };
