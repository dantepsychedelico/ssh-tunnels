const gcp_sa_keys = require('./cert/gcp-sa.json');
const { Storage } = require('@google-cloud/storage');
const Compute = require('@google-cloud/compute');

class Config {
  constructor() {
    let storage = new Storage({
      projectId: gcp_sa_keys.project_id,
      credentials: {
        client_email: gcp_sa_keys.client_email,
        private_key: gcp_sa_keys.private_key
      }
    });
    this.bucket = storage.bucket(gcp_sa_keys.bucket_name);
    this.config_filename = 'config.json'
  }
  async getBucketConfig() {
    let file = this.bucket.file(this.config_filename);
    let [ is_exist ] = await file.exists();
    if (is_exist) {
      let [ binary_context ] = await file.download();
      return JSON.parse(binary_context.toString());
    }
    throw new Error('not found remote config');
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
