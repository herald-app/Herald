const cdk = require("aws-cdk-lib");
const { Stack, NestedStack } = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const { Elasticsearch } = require("../constructs/elasticsearch-construct");

class ESClusterStack extends Stack {
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

    const asg = cluster.addCapacity("DefaultAutoScalingGroup", {
      securityGroup,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MEDIUM
      ),
      desiredCapacity: 3,
      keyName: "herald-key",
    });

    const commands = [
      `sudo su -c 'echo "vm.max_map_count=262144" >> /etc/sysctl.conf'`,
      `sudo ulimit -n 65535`,
      `sudo sysctl --system`,
    ];

    asg.role.attachInlinePolicy(props.iam.ec2PolicySsm);
    asg.role.attachInlinePolicy(props.iam.ec2PolicyEfs);
    asg.role.attachInlinePolicy(props.iam.ecsPolicyExec);
    asg.connections.allowInternally(ec2.Port.tcp(9300));
    asg.addUserData(...commands);

    this.es01 = new ElasticsearchStack(this, "ES01Stack", {
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

    this.es02 = new ElasticsearchStack(this, "ES02Stack", {
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

    this.es03 = new ElasticsearchStack(this, "ES03Stack", {
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
  }
}

class ElasticsearchStack extends NestedStack {
  constructor(scope, id, NestedStackProps) {
    super(scope, id, NestedStackProps);

    this.stack = new Elasticsearch(this, `ES01`, {
      securityGroup: NestedStackProps.securityGroup,
      nodeName: NestedStackProps.nodeName,
      vpc: NestedStackProps.vpc,
      cluster: NestedStackProps.cluster,
      namespace: NestedStackProps.namespace,
      setupServer: NestedStackProps.setupServer,
      certsFileSystem: NestedStackProps.certsFileSystem,
      certsVolume: NestedStackProps.certsVolume,
      dataFileSystem: NestedStackProps.dataFileSystem,
      dataVolume: NestedStackProps.dataVolume,
      clusterInitialMasterNodes: NestedStackProps.clusterInitialMasterNodes,
      discoverySeedHosts: NestedStackProps.discoverySeedHosts,
    });
  }
}

module.exports = { ESClusterStack };
