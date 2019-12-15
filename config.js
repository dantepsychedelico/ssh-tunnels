const fs = require('fs');
const Compute = require('@google-cloud/compute');

const gcp_sa_keys = require('./cert/zac-chung-dev-15c40ec8cc42.json');

class Config {
  async getConfig() {
    return require('./config.json');
  }
  async getVmIp(zone, instance_name) {
    const compute = new Compute({
      projectId: gcp_sa_keys.project_id,
      credentials: {
        client_email: gcp_sa_keys.client_email,
        private_key: gcp_sa_keys.private_key
      }
    });
    const compute_zone = compute.zone(zone);
    const vm = compute_zone.vm(instance_name);
    let [ metadata ] = await vm.getMetadata();
    if (metadata.status !== 'RUNNING') {
      throw new Error('VM is not running');
    }
    return metadata.networkInterfaces[0].accessConfigs[0].natIP;
  }
}

module.exports = { Config };
