const { Stack } = require("aws-cdk-lib");
const { Policy, PolicyStatement } = require("aws-cdk-lib/aws-iam");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const elbv2 = require("aws-cdk-lib/aws-elasticloadbalancingv2");
const acm = require("aws-cdk-lib/aws-certificatemanager");
const { Kibana } = require("../constructs/kibana-construct");

class KibanaStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, "Kibana-Cluster", {
      vpc: props.vpc,
      name: "kibana-cluster",
    });

    const asg = cluster.addCapacity("DefaultAutoScalingGroup", {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.SMALL
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

    new Kibana(this, "Kibana-Instance", {
      vpc: props.vpc,
      securityGroup: props.securityGroup,
      cluster,
      namespace: props.namespace,
      certsVolume: props.certsVolume,
      dataVolume: props.dataVolume,
    });
  }
}

module.exports = { KibanaStack };
