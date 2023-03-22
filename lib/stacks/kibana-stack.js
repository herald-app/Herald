const { Stack } = require("aws-cdk-lib");
const { Policy, PolicyStatement } = require("aws-cdk-lib/aws-iam");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const elbv2 = require("aws-cdk-lib/aws-elasticloadbalancingv2");
const acm = require("aws-cdk-lib/aws-certificatemanager");
const { Kibana } = require("../constructs/kibana-construct");

class KibanaStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, "Kibana-Cluster", {
      vpc: props.vpc,
      name: "kibana-cluster",
    });

    const asg = cluster.addCapacity("DefaultAutoScalingGroup", {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.SMALL
      ),
      desiredCapacity: 1,
      securityGroup: props.securityGroup,
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

    asg.role.attachInlinePolicy(ec2PolicySsm);
    asg.role.attachInlinePolicy(ec2PolicyEfs);
    asg.role.attachInlinePolicy(ecsPolicyExec);
    asg.connections.allowFromAnyIpv4(ec2.Port.tcp(22));
    asg.connections.allowFromAnyIpv4(ec2.Port.tcp(443));

    // const lb = new elbv2.ApplicationLoadBalancer(this, "Kibana-LB", {
    //   vpc: props.vpc,
    //   internetFacing: true,
    //   securityGroup: props.securityGroup,
    // });

    // lb.connections.allowFromAnyIpv4(ec2.Port.tcp(5601));

    // const listener = lb.addListener("Kibana-LB-Listener", {
    //   port: 5601,
    //   protocol: elbv2.ApplicationProtocol.HTTP,
    // });

    // listener.addTargets("ApplicationFleet", {
    //   port: 5601,
    //   protocol: elbv2.ApplicationProtocol.HTTPS,
    //   targets: [asg],
    // });

    new Kibana(this, "Kibana-Instance", {
      vpc: props.vpc,
      securityGroup: props.securityGroup,
      cluster,
      namespace: props.namespace,
      certsVolume: props.certsVolume,
      dataVolume: props.dataVolume,
    });
  }
}

module.exports = { KibanaStack };
