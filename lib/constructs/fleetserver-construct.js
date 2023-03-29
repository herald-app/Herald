const { Construct } = require("constructs");
const ecs = require("aws-cdk-lib/aws-ecs");
const ec2 = require("aws-cdk-lib/aws-ec2");
const servicediscovery = require("aws-cdk-lib/aws-servicediscovery");

class FleetServer extends Construct {
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
        "docker.elastic.co/beats/elastic-agent:8.6.2"
      ),
      memoryLimitMiB: 2048,
      environment: {
        FLEET_SERVER_ENABLE: "1",
        ELASTICSEARCH_HOST: "https://es01.service.local:9200",
        FLEET_SERVER_ELASTICSEARCH_CA: "/usr/share/elastic-agent/config/certs/ca/ca.crt",
        ELASTICSEARCH_USERNAME: "elastic",
        ELASTICSEARCH_PASSWORD: "changeme",
        KIBANA_HOST: "http://kibana.service.local:5601",
        FLEET_URL: "https://localhost:8220",
        FLEET_CA: "/usr/share/elastic-agent/config/certs/ca/ca.crt",
        FLEET_SERVER_CERT: "/usr/share/elastic-agent/config/certs/fleet/fleet.crt",
        FLEET_SERVER_CERT_KEY: "/usr/share/elastic-agent/config/certs/fleet/fleet.key",
        CERTIFICATE_AUTHORITIES: "/usr/share/elastic-agent/config/certs/ca/ca.crt",
        FLEET_SERVER_POLICY_ID: "fleet-server-policy",
      },
      portMapping: [
        {
          containerPort: 8220,
          hostPort: 8220,
        },
      ],
      logging,
    });

    container.addMountPoints({
      containerPath: "/usr/share/elastic-agent/config/certs/",
      sourceVolume: props.certsVolume.name,
      readOnly: false,
    });

    const instance = new ecs.Ec2Service(this, `FleetServer-Service`, {
      cluster: props.cluster,
      taskDefinition: taskDef,
      cloudMapOptions: {
        name: props.nodeName,
        cloudMapNamespace: props.namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
      enableExecuteCommand: true,
    });

    instance.connections.allowFromAnyIpv4(ec2.Port.tcp(8220));
    instance.connections.allowTo(props.certsFileSystem, ec2.Port.tcp(2049));
    instance.connections.allowTo(props.es01, ec2.Port.tcp(9200));
  }
}

module.exports = { FleetServer };
