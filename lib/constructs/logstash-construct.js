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
        volumes: [
          props.certsVolume,
          props.volume,
        ],
      }
    );

    // taskDef.addVolume(props.certsVolume);

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

    container.addMountPoints({
      containerPath: '/usr/share/logstash/pipeline/',
      sourceVolume: props.volume.name,
      readOnly: false,
    });

    this.instance = new ecs.Ec2Service(this, `${props.nodeName}-Service`, {
      cluster: props.cluster,
      taskDefinition: taskDef,
      cloudMapOptions: {
        name: props.nodeName,
        cloudMapNamespace: props.namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
      enableExecuteCommand: true,
    });

    this.instance.connections.allowFromAnyIpv4(ec2.Port.tcp(5044));
    this.instance.connections.allowFrom(props.bastionSg, ec2.Port.tcp(22));
    this.instance.connections.allowTo(props.certsFileSystem, ec2.Port.tcp(2049));
    this.instance.connections.allowTo(props.fileSystem, ec2.Port.tcp(2049));
    this.instance.connections.allowTo(props.es01, ec2.Port.tcp(9200));
  }
}

module.exports = { Logstash };
