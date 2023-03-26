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
        "docker.elastic.co/kibana/kibana:8.6.2"
      ),
      memoryLimitMiB: 1024,
      environment: {
        SERVER_NAME: "kibana",
        ELASTICSEARCH_HOSTS: "https://es01.service.local:9200",
        ELASTICSEARCH_USERNAME: "kibana_system",
        ELASTICSEARCH_PASSWORD: "changeme",
        ELASTICSEARCH_SSL_CERTIFICATEAUTHORITIES: "config/certs/ca/ca.crt",
        XPACK_ENCRYPTEDSAVEDOBJECTS_ENCRYPTIONKEY:
          "xfadqmbq5ikzdo8oqy9kj5k4b76n3iiu",
      },
      portMappings: [
        {
          containerPort: 5601,
          hostPort: 5601,
        },
      ],
      logging,
    });

    container.addMountPoints({
      containerPath: "/usr/share/kibana/config/certs/",
      sourceVolume: props.certsVolume.name,
      readOnly: false,
    });

    // container.addMountPoints({
    //   containerPath: "/usr/share/kibana/data/",
    //   sourceVolume: props.dataVolume.name,
    //   readOnly: false,
    // });

    container.addUlimits({
      name: ecs.UlimitName.MEMLOCK,
      hardLimit: -1,
      softLimit: -1,
    });

    const instance = new ecs.FargateService(this, "Kibana-Service", {
      assignPublicIp: true,
      cluster: props.cluster,
      taskDefinition: taskDef,
      cloudMapOptions: {
        name: "kibana",
        cloudMapNamespace: props.namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
      enableExecuteCommand: true,
      desiredCount: 1,
    });

    instance.connections.allowFromAnyIpv4(ec2.Port.tcp(5601));
    instance.connections.allowTo(props.certsFileSystem, ec2.Port.tcp(2049));
    instance.connections.allowTo(props.es01, ec2.Port.tcp(9200));
  }
}

module.exports = { Kibana };
