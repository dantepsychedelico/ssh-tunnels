'use strict';

const EventEmitter = require('events');
const util = require('util');
const osLogin = require('@google-cloud/os-login');
const gcp_sa_keys = require('./cert/gcp-sa.json');

const net = require('net');
const { Client } = require('ssh2');

const { Config } = require('./config');

const privateKey = `$PRIVATE_KEY`;

class Ssh {
  constructor(ssh_config, rule) {
    const { ip, username, private_key } = ssh_config;
    this.conn = new Client();
    this.conn.on('ready', () => {
      console.log('Client :: ready');
      this.forwardIn(rule);
    })
    .on('tcp connection', (info, accept, reject) => {
      console.log('TCP :: INCOMING CONNECTION:');
      console.dir(info);
      let channel;
      let client = net.createConnection({
          host: rule.localHost, 
          port: rule.localPort }, () => {
            console.log('connected to server!');
            channel = accept()
            .on('close', function() {
              console.log('TCP :: CLOSED');
              client.destroy();
              client.end();
            })
            .on('data', function(data) {
              client.write(data);
            });
      });
      client
      .on('data', (data) => {
        channel.write(data);
      })
      .on('close', () => {
        console.log('[Forward CLOSE]');
        client.end();
      })
      .on('error', (err, accept, reject) => {
        console.log('[Forward ERR]', err);
        channel.end();
      })
      .on('end', () => {
        console.log('[Forward END]');
      });
    })
    .on('error', (err) => {
      console.log('[SSH ERR]', err);
    })
    .on('end', () => {
      console.log('[SSH END]');
    })
    .on('close', () => {
      console.log('[SSH CLOSE]');
    })
    .connect({
      host: ip,
      port: 443,
      username: username,
      privateKey: private_key,
      keepaliveInterval: 10000
    });
  }
  forwardIn(rule) {
    this.conn.forwardIn('0.0.0.0', rule.remotePort, (err) => {
      console.log(`connect forwardIn ${rule.remotePort}`);
      if (err) {
        console.log(err);
        this.conn.exec(`kill $(netstat -t4lnp | grep "${rule.remotePort}" | grep -o "[0-9]*/sshd" | grep -o "[0-9]*")`, (err, stream) => {
          if (err) console.log(err);
          stream.on('data', (data) => {
            console.log(data.toString('utf8'));
          }).on('close', () => {
            setTimeout(()=> {
              this.forwardIn(rule);
            }, 1000);
          }).on('error', (err) => {
            console.log(err);
          });
        })
      } else {
        console.log(`Listening for connections on server on port ${rule.remotePort}!`);
      }
    });
  }
}

const event = new EventEmitter();
event
.on('start', async (wait_time) => {
  setTimeout(() => {
    main();
  }, wait_time);
});

async function main() {
  try {
    let config = new Config();
    let remote_conf = await config.getBucketConfig();
    const { username, private_key, rules, zone, instance_name } = remote_conf;
    let ip = await config.getVmIp(zone, instance_name);
    let closed_count = 0;
    rules.map((rule) => {
      let _ssh = new Ssh({ ip, username, private_key }, rule)
      _ssh.conn.on('close', () => {
        closed_count += 1;
        if (closed_count === rules.length) {
          event.emit('start', 1000);
        }
      });
    });
  } catch(err) {
    console.log(err);
  }
}

event.emit('start', 0);
