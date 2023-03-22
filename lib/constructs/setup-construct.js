const { Construct } = require("constructs");
const ecs = require("aws-cdk-lib/aws-ecs");
const ec2 = require("aws-cdk-lib/aws-ec2");
const servicediscovery = require("aws-cdk-lib/aws-servicediscovery");

class Setup extends Construct {
  constructor(scope, id, props) {
    super(scope, id, props);

    const logging = new ecs.AwsLogDriver({ streamPrefix: "es" });

    const setupTaskDef = new ecs.Ec2TaskDefinition(this, "SetupTaskDef", {
      networkMode: ecs.NetworkMode.AWS_VPC,
    });

    setupTaskDef.addVolume(props.certsVolume);

    const setupContainer = setupTaskDef.addContainer("Setup-Container", {
      image: ecs.ContainerImage.fromRegistry(
        "wayneoco/herald-elastic:setup-amd64-latest"
      ),
      memoryLimitMiB: 4096,
      logging,
    });

    setupContainer.addMountPoints({
      containerPath: "/usr/share/elasticsearch/config/certs",
      sourceVolume: props.certsVolume.name,
      readOnly: false,
    });

    const service = new ecs.Ec2Service(this, "ES-Service", {
      cluster: props.cluster,
      taskDefinition: setupTaskDef,
      securityGroups: [props.securityGroup],
      cloudMapOptions: {
        name: "setup",
        cloudMapNamespace: props.namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
      enableExecuteCommand: true,
    });

    service.connections.allowFrom(props.securityGroup, ec2.Port.tcp(443));
    service.connections.allowFrom(props.securityGroup, ec2.Port.tcp(9200));
    service.connections.allowFrom(props.securityGroup, ec2.Port.tcp(9300));
  }
}

module.exports = { Setup };
