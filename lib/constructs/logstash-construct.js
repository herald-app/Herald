const { Construct } = require("constructs");
const ecs = require("aws-cdk-lib/aws-ecs");
const ec2 = require("aws-cdk-lib/aws-ec2");
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
      image: ecs.ContainerImage.fromRegistry(
        "wayneoco/herald-logstash:amd64-latest"
      ),
      memoryLimitMiB: 2048,
      portMapping: [
        {
          containerPort: 5044,
          hostPort: 5044,
        },
      ],
      logging,
    });

    container.addMountPoints({
      containerPath: "/usr/share/logstash/config/certs/",
      sourceVolume: props.certsVolume.name,
      readOnly: false,
    });

    const service = new ecs.Ec2Service(this, `${props.nodeName}-Service`, {
      cluster: props.cluster,
      taskDefinition: taskDef,
      securityGroups: [props.securityGroup],
      cloudMapOptions: {
        name: props.nodeName,
        cloudMapNamespace: props.namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
      enableExecuteCommand: true,
    });

    service.connections.allowFromAnyIpv4(ec2.Port.tcp(5044));
  }
}

module.exports = { Logstash };