const { Construct } = require("constructs");
const ecs = require("aws-cdk-lib/aws-ecs");
const ec2 = require("aws-cdk-lib/aws-ec2");
const servicediscovery = require("aws-cdk-lib/aws-servicediscovery");

class Kibana extends Construct {
  constructor(scope, id, props) {
    super(scope, id, props);

    const logging = new ecs.AwsLogDriver({ streamPrefix: "kibana" });

    const taskDef = new ecs.FargateTaskDefinition(this, "KibanaTaskDef", {
      networkMode: ecs.NetworkMode.AWS_VPC,
      memoryLimitMiB: 2048, // for Fargate task definitions
    });

    taskDef.addVolume(props.certsVolume);
    // taskDef.addVolume(props.dataVolume);

    const container = taskDef.addContainer("Kibana-Node", {
      image: ecs.ContainerImage.fromRegistry(
        "wayneoco/herald-kibana:amd64-latest"
      ),
      memoryLimitMiB: 1024,
      portMappings: [
        {
          containerPort: 5601,
          hostPort: 5601,
        },
      ],
      // command: ["bin/bash", "-c", "./bin/kibana-encryption-keys"],
      logging,
    });

    container.addMountPoints({
      containerPath: "/usr/share/kibana/config/certs/",
      sourceVolume: props.certsVolume.name,
      readOnly: false,
    });

    container.addMountPoints({
      containerPath: "/usr/share/kibana/data/",
      sourceVolume: props.dataVolume.name,
      readOnly: false,
    });

    // container.addUlimits({
    //   name: ecs.UlimitName.MEMLOCK,
    //   hardLimit: -1,
    //   softLimit: -1,
    // });

    const service = new ecs.FargateService(this, "Kibana-Service", {
      assignPublicIp: true,
      cluster: props.cluster,
      securityGroups: [props.securityGroup],
      taskDefinition: taskDef,
      cloudMapOptions: {
        name: "kibana",
        cloudMapNamespace: props.namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
      enableExecuteCommand: true,
      desiredCount: 1,
    });

    service.connections.allowFromAnyIpv4(ec2.Port.tcp(5601));
  }
}

module.exports = { Kibana };
