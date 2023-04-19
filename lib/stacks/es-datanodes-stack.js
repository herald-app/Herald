const { Duration, Stack } = require("aws-cdk-lib");
const autoscaling = require('aws-cdk-lib/aws-autoscaling');
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const { ESDataStack } = require('./es-data-nestedstack');

class ESDataNodesStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, "ES-Cluster", {
      vpc: props.vpc,
      name: "es-cluster",
    });

    const securityGroup = new ec2.SecurityGroup(this, "ES-SecurityGroup", {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    const commands = [
      `sudo su -c 'echo "vm.max_map_count=262144" >> /etc/sysctl.conf'`,
      `sudo ulimit -n 65535`,
      `sudo sysctl --system`,
    ];

    const dataAsg = new autoscaling.AutoScalingGroup(this, 'DataAsg', {
      vpc: props.vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MEDIUM
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux(),
      minCapacity: 2,
      maxCapacity: 12,
      keyName: "herald-key"
    });

    dataAsg.role.attachInlinePolicy(props.iam.ec2PolicySsm);
    dataAsg.role.attachInlinePolicy(props.iam.ec2PolicyEfs);
    dataAsg.role.attachInlinePolicy(props.iam.ecsPolicyExec);
    dataAsg.connections.allowInternally(ec2.Port.tcp(9300));
    dataAsg.addUserData(...commands);
    dataAsg.scaleOnCpuUtilization('CPUScaling', {
      targetUtilizationPercent: 60,
      scaleInCooldown: Duration.minutes(5),
      scaleOutCooldown: Duration.minutes(5),
    });

    const dataAsgCapacityProvider = new ecs.AsgCapacityProvider(this, 'DataAsgCapacityProvider', {
      autoScalingGroup: dataAsg,
      capacityProviderName: 'dataAsg',
    });

    const dataCapacityProviderStrategy = {
      capacityProvider: dataAsgCapacityProvider.capacityProviderName,
    };

    const asg = cluster.addCapacity("DefaultAutoScalingGroup", {
      securityGroup,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MEDIUM
      ),
      minCapacity: 5,
      maxCapacity: 15,
      keyName: "herald-key"
    });

    asg.role.attachInlinePolicy(props.iam.ec2PolicySsm);
    asg.role.attachInlinePolicy(props.iam.ec2PolicyEfs);
    asg.role.attachInlinePolicy(props.iam.ecsPolicyExec);
    asg.connections.allowInternally(ec2.Port.tcp(9300));
    asg.addUserData(...commands);

    this.es01 = new ESMastersStack(this, "ES01Stack", {
      bastionSg: props.bastionSg,
      securityGroup,
      cluster,
      nodeName: "es01",
      namespace: props.namespace,
      setupServer: props.setupServer,
      certsFileSystem: props.certsFileSystem,
      certsVolume: props.certsVolume,
      dataFileSystem: props.dataFileSystems.es01,
      dataVolume: props.dataVolumes.es01,
      clusterInitialMasterNodes:
        "es01.service.local,es02.service.local,es03.service.local",
      discoverySeedHosts: "es02.service.local,es03.service.local",
    });

    this.es02 = new ESMastersStack(this, "ES02Stack", {
      bastionSg: props.bastionSg,
      securityGroup,
      cluster,
      nodeName: "es02",
      namespace: props.namespace,
      setupServer: props.setupServer,
      certsFileSystem: props.certsFileSystem,
      certsVolume: props.certsVolume,
      dataFileSystem: props.dataFileSystems.es02,
      dataVolume: props.dataVolumes.es02,
      clusterInitialMasterNodes:
        "es01.service.local,es02.service.local,es03.service.local",
      discoverySeedHosts: "es01.service.local,es03.service.local",
    });
    this.es02.addDependency(this.es01);

    this.es03 = new ESMastersStack(this, "ES03Stack", {
      bastionSg: props.bastionSg,
      securityGroup,
      cluster,
      nodeName: "es03",
      namespace: props.namespace,
      setupServer: props.setupServer,
      certsFileSystem: props.certsFileSystem,
      certsVolume: props.certsVolume,
      dataFileSystem: props.dataFileSystems.es03,
      dataVolume: props.dataVolumes.es03,
      clusterInitialMasterNodes:
        "es01.service.local,es02.service.local,es03.service.local",
      discoverySeedHosts: "es01.service.local,es02.service.local",
    });
    this.es03.addDependency(this.es01);

    this.dataNode = new ESDataStack(this, 'DataNodeStack', {
      bastionSg: props.bastionSg,
      securityGroup,
      cluster,
      capacityProviderStrategy: dataCapacityProviderStrategy,
      nodeName: 'dataNode',
      namespace: props.namespace,
      setupServer: props.setupServer,
      certsFileSystem: props.certsFileSystem,
      certsVolume: props.certsVolume,
      role: props.iam.ec2DiscoveryRole,
    });
    this.dataNode.addDependency(this.es03);
  }
}

module.exports = { ESDataNodesStack };
