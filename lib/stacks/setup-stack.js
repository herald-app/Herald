const { Stack } = require("aws-cdk-lib");
const { Policy, PolicyStatement } = require("aws-cdk-lib/aws-iam");
const autoscaling = require("aws-cdk-lib/aws-autoscaling");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const iam = require("aws-cdk-lib/aws-iam");
const { Setup } = require("../constructs/setup-construct");

class SetupStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    this.cluster = new ecs.Cluster(this, "ES-Cluster", {
      vpc: props.vpc,
      name: "es-cluster",
    });

    // const role = new iam.Role(this, "Ec2Role", {
    //   assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
    // });

    // const launchTemplate = new ec2.LaunchTemplate(this, "LaunchTemplate", {
    //   machineImage: ec2.MachineImage.latestAmazonLinux(),
    //   instanceType: ec2.InstanceType.of(
    //     ec2.InstanceClass.T2,
    //     ec2.InstanceSize.LARGE
    //   ),
    //   securityGroup: new ec2.SecurityGroup(this, "LaunchTemplate-SG", {
    //     vpc: props.vpc,
    //   }),
    //   role,
    // });

    // const asg = new autoscaling.AutoScalingGroup(this, "ASG", {
    //   vpc: props.vpc,
    //   launchTemplate,
    //   desiredCapacity: 5,
    //   max_capacity: 5,
    // });

    // this.capacityProvider = new ecs.AsgCapacityProvider(
    //   this,
    //   "AsgCapacityProvider",
    //   {
    //     autoScalingGroup: asg,
    //     enableManagedTerminationProtection: true,
    //     canContainersAccessInstanceRole: true,
    //   }
    // );

    // this.cluster.addAsgCapacityProvider(this.capacityProvider);

    const asg = this.cluster.addCapacity("DefaultAutoScalingGroup", {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.LARGE
      ),
      desiredCapacity: 4,
      keyName: "herald-key",
    });

    const ecsPolicyExec = new Policy(this, "ecs-policy-exec", {
      policyName: "ecs-exec",
      statements: [
        PolicyStatement.fromJson({
          Sid: "ecsexec",
          Effect: "Allow",
          Action: "ecs:ExecuteCommand",
          Resource: "*",
        }),
      ],
    });

    const ec2PolicySsm = new Policy(this, "ec2-policy-ssm", {
      policyName: "ec2-ssm",
      statements: [
        PolicyStatement.fromJson({
          Effect: "Allow",
          Action: [
            "ssmmessages:CreateControlChannel",
            "ssmmessages:CreateDataChannel",
            "ssmmessages:OpenControlChannel",
            "ssmmessages:OpenDataChannel",
          ],
          Resource: "*",
        }),
      ],
    });

    const ec2PolicyEfs = new Policy(this, "ec2-policy-create-efs", {
      policyName: "Create-EFS",
      statements: [
        PolicyStatement.fromJson({
          Effect: "Allow",
          Action: [
            "ec2:AttachVolume",
            "ec2:CreateVolume",
            "ec2:CreateSnapshot",
            "ec2:CreateTags",
            "ec2:DeleteVolume",
            "ec2:DeleteSnapshot",
            "ec2:DescribeAvailabilityZones",
            "ec2:DescribeInstances",
            "ec2:DescribeVolumes",
            "ec2:DescribeVolumeAttribute",
            "ec2:DescribeVolumeStatus",
            "ec2:DescribeSnapshots",
            "ec2:CopySnapshot",
            "ec2:DescribeSnapshotAttribute",
            "ec2:DetachVolume",
            "ec2:ModifySnapshotAttribute",
            "ec2:ModifyVolumeAttribute",
            "ec2:DescribeTags",
            "elasticfilesystem:CreateFileSystem",
            "elasticfilesystem:CreateTags",
            "elasticfilesystem:DeleteTags",
            "elasticfilesystem:CreateMountTarget",
            "elasticfilesystem:DescribeFileSystems",
            "elasticfilesystem:DescribeMountTargets",
            "elasticfilesystem:DeleteMountTargets",
            "elasticfilesystem:DeleteFileSystem",
          ],
          Resource: "*",
        }),
      ],
    });

    const commands = [
      `sudo su -c 'echo "vm.max_map_count=262144" >> /etc/sysctl.conf'`,
      `sudo ulimit -n 65535`,
      `sudo sysctl --system`,
    ];

    asg.role.attachInlinePolicy(ec2PolicySsm);
    asg.role.attachInlinePolicy(ec2PolicyEfs);
    asg.role.attachInlinePolicy(ecsPolicyExec);
    asg.connections.allowFromAnyIpv4(ec2.Port.tcp(22));
    asg.connections.allowFromAnyIpv4(ec2.Port.tcp(443));
    asg.addUserData(...commands);

    new Setup(this, "Setup-ES-Node", {
      vpc: props.vpc,
      securityGroup: props.securityGroup,
      namespace: props.namespace,
      cluster: this.cluster,
      certsVolume: props.certsVolume,
    });
  }
}

module.exports = { SetupStack };
