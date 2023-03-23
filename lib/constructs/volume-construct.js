const { Construct } = require("constructs");

class Volume extends Construct {
  constructor(scope, id, props) {
    super(scope, id, props);

    this.volume = {
      name: props.volumeName,
      efsVolumeConfiguration: {
        fileSystemId: props.fileSystemId,
      },
    };
  }
}

module.exports = { Volume };
