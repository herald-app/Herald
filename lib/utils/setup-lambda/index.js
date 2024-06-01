require("dotenv").config();
const { ECSClient, UpdateServiceCommand } = require("@aws-sdk/client-ecs");

exports.handler = async () => {
  const client = new ECSClient({ region: process.env.AWS_REGION });

  try {
    const updateCommand = new UpdateServiceCommand({
      cluster: process.env.SETUP_SERVICE_CLUSTER,
      service: process.env.SETUP_SERVICE_NAME,
      desiredCount: 0,
    });
    await client.send(updateCommand);
  } catch (error) {
    throw new Error(error);
  }
};
