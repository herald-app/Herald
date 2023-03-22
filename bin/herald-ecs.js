#!/usr/bin/env node

const cdk = require("aws-cdk-lib");
const { HeraldAppStage } = require("../lib/herald-app-stage");

const app = new cdk.App();

new HeraldAppStage(app, "HeraldAppStage", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
