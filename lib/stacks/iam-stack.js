const { Stack } = require("aws-cdk-lib");
const {
  Policy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} = require("aws-cdk-lib/aws-iam");

class IamStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    this.ecsPolicyExec = new Policy(this, "ecs-policy-exec", {
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

    this.ec2PolicySsm = new Policy(this, "ec2-policy-ssm", {
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

    this.ec2PolicyEfs = new Policy(this, "ec2-policy-create-efs", {
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

    const lambdaPolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          actions: ["ecs:UpdateService"],
          resources: ["*"],
        }),
      ],
    });

    this.lambdaRole = new Role(this, "LambdaRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      inlinePolicies: [lambdaPolicy],
    });
  }
}

module.exports = { IamStack };
