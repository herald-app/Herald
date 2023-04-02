const { CfnOutput, Duration } = require('aws-cdk-lib');
const { Construct } = require("constructs");
const ecs = require("aws-cdk-lib/aws-ecs");
const ec2 = require("aws-cdk-lib/aws-ec2");
const elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
const servicediscovery = require("aws-cdk-lib/aws-servicediscovery");

class Logstash extends Construct {
  constructor(scope, id, props) {
    super(scope, id, props);

    const logging = new ecs.AwsLogDriver({ streamPrefix: props.nodeName });

    const taskDef = new ecs.Ec2TaskDefinition(
      this,
      `${props.nodeName}-TaskDef`,
      {
        networkMode: ecs.NetworkMode.AWS_VPC,
      }
    );

    taskDef.addVolume(props.certsVolume);

    const container = taskDef.addContainer(`${props.nodeName}`, {
      image: ecs.ContainerImage.fromRegistry("heraldinc/logstash:amd64-latest"),
      memoryLimitMiB: 2048,
      portMappings: [
        {
          containerPort: 5044,
          hostPort: 5044,
          protocol: ecs.Protocol.TCP,
        },
      ],
      logging,
    });

    container.addMountPoints({
      containerPath: "/usr/share/logstash/config/certs/",
      sourceVolume: props.certsVolume.name,
      readOnly: true,
    });

    const instance = new ecs.Ec2Service(this, `${props.nodeName}-Service`, {
      cluster: props.cluster,
      taskDefinition: taskDef,
      cloudMapOptions: {
        name: props.nodeName,
        cloudMapNamespace: props.namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
      enableExecuteCommand: true,
    });

    const lb = new elbv2.NetworkLoadBalancer(this, 'Logstash-LB', { vpc: props.vpc });
    const listener = lb.addListener('Listener', { port: 5044, protocol: elbv2.Protocol.TCP });

    listener.addTargets('Target', {
      port: 5044,
      protocol: elbv2.Protocol.TCP,
      targets: [instance.loadBalancerTarget({
        containerName: props.nodeName,
        containerPort: 5044,
        protocol: ecs.Protocol.TCP,
      })],
    });

    instance.connections.allowFromAnyIpv4(ec2.Port.tcp(5044));
    instance.connections.allowFrom(props.bastionSg, ec2.Port.tcp(22));
    instance.connections.allowTo(props.certsFileSystem, ec2.Port.tcp(2049));
    instance.connections.allowTo(props.es01, ec2.Port.tcp(9200));

    new CfnOutput(this, 'LoadBalancerDNS', { value: lb.loadBalancerDnsName });
  }
}

module.exports = { Logstash };
