const { CfnOutput, Stack } = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const elbv2 = require('aws-ck-lib/aws-elasticloadbalancingv2');
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
      desiredCapacity: 2,
      keyName: "herald-key",
    });

    asg.role.attachInlinePolicy(props.iam.ec2PolicySsm);
    asg.role.attachInlinePolicy(props.iam.ec2PolicyEfs);
    asg.role.attachInlinePolicy(props.iam.ecsPolicyExec);

    this.stack = new Logstash(this, `Logstash`, {
      vpc: props.vpc,
      cluster,
      bastionSg: props.bastionSg,
      namespace: props.namespace,
      es01: props.es01,
      certsFileSystem: props.certsFileSystem,
      certsVolume: props.certsVolume,
      nodeName: "logstash",
    });

    this.lb = new elbv2.NetworkLoadBalancer(this, 'Logstash-LB', { vpc: props.vpc });
    const listener = this.lb.addListener('Listener', { port: 5044, protocol: elbv2.Protocol.TCP });

    listener.addTargets('Target', {
      port: 5044,
      protocol: elbv2.Protocol.TCP,
      targets: [this.stack.instance.loadBalancerTarget({
        containerName: props.nodeName,
        containerPort: 5044,
        protocol: ecs.Protocol.TCP,
      })],
    });

    new CfnOutput(this, 'LoadBalancerDNS', { value: this.lb.loadBalancerDnsName });

  }
}

module.exports = { LogstashStack };
