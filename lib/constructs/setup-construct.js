const { Construct } = require("constructs");
const ecs = require("aws-cdk-lib/aws-ecs");
const ec2 = require("aws-cdk-lib/aws-ec2");
const servicediscovery = require("aws-cdk-lib/aws-servicediscovery");

class Setup extends Construct {
  constructor(scope, id, props) {
    super(scope, id, props);

    const logging = new ecs.AwsLogDriver({ streamPrefix: "es" });

    const taskDef = new ecs.Ec2TaskDefinition(this, "SetupTaskDef", {
      networkMode: ecs.NetworkMode.AWS_VPC,
    });

    taskDef.addVolume(props.certsVolume);

    const container = taskDef.addContainer("Setup-Container", {
      image: ecs.ContainerImage.fromRegistry(
        "kowshiki/elasticsearch-setup:amd64-latest"
      ),
      memoryLimitMiB: 2048,
      logging,
    });

    container.addMountPoints({
      containerPath: "/usr/share/elasticsearch/config/certs",
      sourceVolume: props.certsVolume.name,
      readOnly: false,
    });

    this.instance = new ecs.Ec2Service(this, "ES-Service", {
      cluster: props.cluster,
      taskDefinition: taskDef,
      cloudMapOptions: {
        name: "setup",
        cloudMapNamespace: props.namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
      enableExecuteCommand: true,
    });

    this.instance.connections.allowTo(
      props.certsFileSystem,
      ec2.Port.tcp(2049)
    );
  }
}

module.exports = { Setup };
