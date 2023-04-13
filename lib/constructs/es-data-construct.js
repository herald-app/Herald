const { Construct } = require("constructs");
const { Duration } = require('aws-cdk-lib');
const ecs = require("aws-cdk-lib/aws-ecs");
const ec2 = require("aws-cdk-lib/aws-ec2");

class ESData extends Construct {
  constructor(scope, id, props) {
    super(scope, id, props);

    const logging = new ecs.AwsLogDriver({ streamPrefix: `DataNode` });

    this.taskDef = new ecs.Ec2TaskDefinition(
      this,
      `DataNode-TaskDef`,
      {
        networkMode: ecs.NetworkMode.AWS_VPC,
      }
    );

    this.taskDef.addVolume(props.certsVolume);

    const container = this.taskDef.addContainer(`DataNode`, {
      image: ecs.ContainerImage.fromRegistry(
        "heraldinc/elasticsearch:amd64-latest"
      ),
      memoryLimitMiB: 2048,
      environment: {
        ES_SETTING_NODE_ROLES: 'data,ingest',
        ES_SETTING_NETWORK_HOST: '0.0.0.0',
        ES_SETTING_CLUSTER_NAME: "es-cluster",
        ES_SETTING_DISCOVERY_SEED__HOSTS: 'es01.service.local,es02.service.local,es03.service.local',
        ELASTIC_PASSWORD: "changeme",
        ES_SETTING_BOOTSTRAP_MEMORY__LOCK: "true",
        ES_SETTING_XPACK_SECURITY_ENABLED: "true",
        ES_SETTING_XPACK_SECURITY_HTTP_SSL_ENABLED: "true",
        ES_SETTING_XPACK_SECURITY_HTTP_SSL_KEY: `certs/data-node.service.local/data-node.service.local.key`,
        ES_SETTING_XPACK_SECURITY_HTTP_SSL_CERTIFICATE: `certs/data-node.service.local/data-node.service.local.crt`,
        ES_SETTING_XPACK_SECURITY_HTTP_SSL_CERTIFICATE__AUTHORITIES: `certs/ca/ca.crt`,
        ES_SETTING_XPACK_SECURITY_TRANSPORT_SSL_ENABLED: "true",
        ES_SETTING_XPACK_SECURITY_TRANSPORT_SSL_KEY: `certs/data-node.service.local/data-node.service.local.key`,
        ES_SETTING_XPACK_SECURITY_TRANSPORT_SSL_CERTIFICATE: `certs/data-node.service.local/data-node.service.local.crt`,
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
      // entryPoint: [
      //   '/bin/bash',
      //   '-c',
      //   `if [ -f config/certs/certs.zip ]; then \
      //      rm config/certs/certs.zip; \
      //   fi; \
      //    if [ -d config/certs/${props.nodeName}.service.local ]; then \
      //     rm -r config/certs/${props.nodeName}.service.local; \
      //   fi;
      //   su elasticsearch; \
      //   bin/elasticsearch-certutil cert --silent --pem --out config/certs/certs.zip --name ${props.nodeName}.service.local --dns ${props.nodeName}.service.local --ip 0.0.0.0 --ca-cert config/certs/ca/ca.crt --ca-key config/certs/ca/ca.key; \
      //   unzip config/certs/certs.zip -d config/certs/ && rm config/certs/certs.zip; \
      //   bin/elasticsearch;`
      // ],
    });

    container.addMountPoints({
      containerPath: "/usr/share/elasticsearch/config/certs/",
      sourceVolume: props.certsVolume.name,
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

    this.instance = new ecs.Ec2Service(this, `DataNode-Service`, {
      cluster: props.cluster,
      taskDefinition: this.taskDef,
      securityGroups: [props.securityGroup],
      enableExecuteCommand: true,
    });

    const scalableTarget = this.instance.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 12,
    });

    scalableTarget.scaleOnCpuUtilization('CPUScaling', {
      targetUtilizationPercent: 60,
      disableScaleIn: true,
      scaleOutCooldown: Duration.minutes(5),
    });

    this.instance.connections.allowFrom(
      props.securityGroup,
      ec2.Port.tcp(9300)
    );
    this.instance.connections.allowFromAnyIpv4(ec2.Port.tcp(9200));
    this.instance.connections.allowFrom(props.bastionSg, ec2.Port.tcp(22));
    this.instance.connections.allowTo(
      props.certsFileSystem,
      ec2.Port.tcp(2049)
    );
  }
}

module.exports = { ESData };
