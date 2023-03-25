const {
  ECSClient,
  ListContainerInstancesCommand,
  UpdateContainerInstancesCommand,
} = require("@aws-sdk/client-ecs");

exports.handler = async (event) => {
  const client = new ECSClient({ region: "us-east-1" });

  try {
    const listCommand = new ListContainerInstancesCommand({
      cluster: "setup",
    });
    const listResponse = await client.send(listContainersCommand);
    const containerInstances = response.containerInstanceArns;
    const updateCommand = new UpdateContainerInstancesStateCommand({
      containerInstances,
      status: "DRAINING",
    });
    const updateResponse = await client.send(updateContainersCommand);
  } catch (error) {
    throw new Error(error);
  }
};
