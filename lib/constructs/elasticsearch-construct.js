const { Construct } = require("constructs");
const ecs = require("aws-cdk-lib/aws-ecs");
const ec2 = require("aws-cdk-lib/aws-ec2");
const servicediscovery = require("aws-cdk-lib/aws-servicediscovery");

class Elasticsearch extends Construct {
  constructor(scope, id, props) {
    super(scope, id, props);

    const logging = new ecs.AwsLogDriver({ streamPrefix: `${props.nodeName}` });

    const taskDef = new ecs.Ec2TaskDefinition(
      this,
      `${props.nodeName}-TaskDef`,
      {
        networkMode: ecs.NetworkMode.AWS_VPC,
      }
    );

    taskDef.addVolume(props.certsVolume);
    taskDef.addVolume(props.dataVolume);

    const container = taskDef.addContainer(`${props.nodeName}`, {
      image: ecs.ContainerImage.fromRegistry(
        "wayneoco/herald-elastic:master-amd64-latest"
      ),
      memoryLimitMiB: 2048,
      environment: {
        ES_SETTING_NODE_NAME: `${props.nodeName}.service.local`,
        ES_SETTING_NETWORK_HOST: `${props.nodeName}.service.local`,
        ES_SETTING_CLUSTER_NAME: "es-cluster",
        ES_SETTING_CLUSTER_INITIAL__MASTER__NODES:
          props.clusterInitialMasterNodes,
        ES_SETTING_DISCOVERY_SEED__HOSTS: props.discoverySeedHosts,
        ELASTIC_PASSWORD: "changeme",
        ES_SETTING_BOOTSTRAP_MEMORY__LOCK: "true",
        ES_SETTING_XPACK_SECURITY_ENABLED: "true",
        ES_SETTING_XPACK_SECURITY_HTTP_SSL_ENABLED: "true",
        ES_SETTING_XPACK_SECURITY_HTTP_SSL_KEY: `certs/${props.nodeName}.service.local/${props.nodeName}.service.local.key`,
        ES_SETTING_XPACK_SECURITY_HTTP_SSL_CERTIFICATE: `certs/${props.nodeName}.service.local/${props.nodeName}.service.local.crt`,
        ES_SETTING_XPACK_SECURITY_HTTP_SSL_CERTIFICATE__AUTHORITIES: `certs/ca/ca.crt`,
        ES_SETTING_XPACK_SECURITY_TRANSPORT_SSL_ENABLED: "true",
        ES_SETTING_XPACK_SECURITY_TRANSPORT_SSL_KEY: `certs/${props.nodeName}.service.local/${props.nodeName}.service.local.key`,
        ES_SETTING_XPACK_SECURITY_TRANSPORT_SSL_CERTIFICATE: `certs/${props.nodeName}.service.local/${props.nodeName}.service.local.crt`,
        ES_SETTING_XPACK_SECURITY_TRANSPORT_SSL_CERTIFICATE__AUTHORITIES: `certs/ca/ca.crt`,
        ES_SETTING_XPACK_SECURITY_TRANSPORT_SSL_VERIFICATION__MODE:
          "certificate",
        ES_SETTINGS_XPACK_LICENSE_SELF__GENERATED_TYPE: "basic",
      },
      portMappings: [
        {
          containerPort: 9200,
          hostPort: 9200,
        },
        {
          containerPort: 9300,
          hostPort: 9300,
        },
      ],
      logging,
    });

    container.addMountPoints({
      containerPath: "/usr/share/elasticsearch/config/certs/",
      sourceVolume: props.certsVolume.name,
      readOnly: false,
    });

    container.addMountPoints({
      containerPath: "/usr/share/elasticsearch/data",
      sourceVolume: props.dataVolume.name,
      readOnly: false,
    });

    container.addUlimits({
      name: ecs.UlimitName.MEMLOCK,
      hardLimit: -1,
      softLimit: -1,
    });

    container.addUlimits({
      name: ecs.UlimitName.NOFILE,
      hardLimit: 65535,
      softLimit: 65535,
    });

    this.instance = new ecs.Ec2Service(this, `${props.nodeName}-Service`, {
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

    this.instance.connections.allowFrom(
      props.securityGroup,
      ec2.Port.tcp(9300)
    );
    this.instance.connections.allowFrom(props.setupServer, ec2.Port.tcp(9200));
    this.instance.connections.allowTo(
      props.certsFileSystem,
      ec2.Port.tcp(2049)
    );
    this.instance.connections.allowTo(props.dataFileSystem, ec2.Port.tcp(2049));
  }
}

module.exports = { Elasticsearch };
