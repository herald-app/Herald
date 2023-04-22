const { Duration, Stack } = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const { ESMasterNestedStack } = require("./es-master-nestedstack");
const { ESDataNestedStack } = require('./es-data-nestedstack');

class ElasticsearchStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const masterCluster = new ecs.Cluster(this, "ES-Master", {
      vpc: props.vpc,
      name: "es-master-cluster",
    });

    const dataCluster = new ecs.Cluster(this,'ES-Data', {
      vpc: props.vpc,
      name: 'es-data-cluster',
    });

    const securityGroup = new ec2.SecurityGroup(this, "ES-SecurityGroup", {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    const commands = [
      `stty sane`,
      `export TERM=linux`,
      `sudo su -c 'echo "vm.max_map_count=262144" >> /etc/sysctl.conf'`,
      `sudo ulimit -n 65535`,
      `sudo sysctl --system`,
    ];

    const masterAsg = masterCluster.addCapacity("MasterAutoScalingGroup", {
      securityGroup,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MEDIUM
      ),
      desiredCapacity: 3,
      keyName: "herald-key"
    });

    masterAsg.role.attachInlinePolicy(props.iam.ec2PolicySsm);
    masterAsg.role.attachInlinePolicy(props.iam.ec2PolicyEfs);
    masterAsg.role.attachInlinePolicy(props.iam.ecsPolicyExec);
    masterAsg.connections.allowInternally(ec2.Port.tcp(9300));
    masterAsg.addUserData(...commands);

    const dataAsg = dataCluster.addCapacity("DataAutoScalingGroup", {
      securityGroup,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MEDIUM
      ),
      desiredCapacity: 1,
      maxCapacity: 12,
      keyName: "herald-key"
    });

    dataAsg.role.attachInlinePolicy(props.iam.ec2PolicySsm);
    dataAsg.role.attachInlinePolicy(props.iam.ec2PolicyEfs);
    dataAsg.role.attachInlinePolicy(props.iam.ecsPolicyExec);
    dataAsg.connections.allowInternally(ec2.Port.tcp(9300));
    dataAsg.addUserData(...commands);

    this.es01 = new ESMasterNestedStack(this, "ES01Stack", {
      bastionSg: props.bastionSg,
      securityGroup,
      cluster: masterCluster,
      nodeName: "es01",
      namespace: props.namespace,
      setupServer: props.setupServer,
      certsFileSystem: props.certsFileSystem,
      certsVolume: props.certsVolume,
      clusterInitialMasterNodes:
        "es01.service.local,es02.service.local,es03.service.local",
      discoverySeedHosts: "es02.service.local,es03.service.local",
    });

    const es02 = new ESMasterNestedStack(this, "ES02Stack", {
      bastionSg: props.bastionSg,
      securityGroup,
      cluster: masterCluster,
      nodeName: "es02",
      namespace: props.namespace,
      setupServer: props.setupServer,
      certsFileSystem: props.certsFileSystem,
      certsVolume: props.certsVolume,
      clusterInitialMasterNodes:
        "es01.service.local,es02.service.local,es03.service.local",
      discoverySeedHosts: "es01.service.local,es03.service.local",
    });
    es02.addDependency(this.es01);

    const es03 = new ESMasterNestedStack(this, "ES03Stack", {
      bastionSg: props.bastionSg,
      securityGroup,
      cluster: masterCluster,
      nodeName: "es03",
      namespace: props.namespace,
      setupServer: props.setupServer,
      certsFileSystem: props.certsFileSystem,
      certsVolume: props.certsVolume,
      clusterInitialMasterNodes:
        "es01.service.local,es02.service.local,es03.service.local",
      discoverySeedHosts: "es01.service.local,es02.service.local",
    });
    es03.addDependency(this.es01);

    const dataNode = new ESDataNestedStack(this, `DataNodeStack`, {
      bastionSg: props.bastionSg,
      securityGroup,
      cluster: dataCluster,
      namespace: props.namespace,
      setupServer: props.setupServer,
      certsFileSystem: props.certsFileSystem,
      certsVolume: props.certsVolume,
    });
    dataNode.addDependency(es03);

  }
}

module.exports = { ElasticsearchStack };
