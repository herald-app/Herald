const { CfnOutput, Stack } = require("aws-cdk-lib");
const ecs = require("aws-cdk-lib/aws-ecs");
const ec2 = require("aws-cdk-lib/aws-ec2");
const elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
const { FleetServer } = require("../constructs/fleetserver-construct");

class FleetServerStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, "FleetServer", {
      vpc: props.vpc,
      name: "fleet-server",
    });

    const asg = cluster.addCapacity("DefaultAutoScalingGroup", {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MEDIUM
      ),
      desiredCapacity: 2,
      keyName: "herald-key",
    });

    const commands = [
      `stty sane`,
      `export TERM=linux`,
    ];

    asg.role.attachInlinePolicy(props.iam.ec2PolicySsm);
    asg.role.attachInlinePolicy(props.iam.ec2PolicyEfs);
    asg.role.attachInlinePolicy(props.iam.ecsPolicyExec);
    asg.addUserData(...commands);

    this.lb = new elbv2.NetworkLoadBalancer(this, 'FleetServer-LB', { vpc: props.vpc });
    const listener = this.lb.addListener('Listener', { port: 8220, protocol: elbv2.Protocol.TCP });

    this.stack = new FleetServer(this, "Fleet-Server", {
      vpc: props.vpc,
      cluster,
      bastionSg: props.bastionSg,
      namespace: props.namespace,
      nodeName: "fleet-server",
      es01: props.es01,
      certsFileSystem: props.certsFileSystem,
      certsVolume: props.certsVolume,
      loadBalancerDns: this.lb.loadBalancerDnsName,
    });

    listener.addTargets('Target', {
      port: 8220,
      protocol: elbv2.Protocol.TCP,
      targets: [this.stack.instance.loadBalancerTarget({
        containerName: 'fleet-server',
        containerPort: 8220,
        protocol: ecs.Protocol.TCP,
      })],
    });
    
    new CfnOutput(this, 'FleetServerLoadBalancerDNS', { value: this.lb.loadBalancerDnsName });
  }
}


module.exports = { FleetServerStack };
