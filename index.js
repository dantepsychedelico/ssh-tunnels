'use strict';

const util = require('util');
const osLogin = require('@google-cloud/os-login');
const gcp_sa_keys = require('./gcp-sa.json');

const net = require('net');
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config.json'), {encoding: 'utf8'}));

const privateKey = `$PRIVATE_KEY`;

class Ssh {
  constructor(config) {
    this.conn = new Client();
    this.conn.on('ready', () => {
      console.log('Client :: ready');
      this.forwardIn(config);
    })
    .on('tcp connection', (info, accept, reject) => {
      console.log('TCP :: INCOMING CONNECTION:');
      console.dir(info);
      let channel;
      let client = net.createConnection({
          host: config.localHost, 
          port: config.localPort }, () => {
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
    .on('error', () => {
      console.log('[SSH ERR]', arguments);
    })
    .on('end', () => {
      console.log('[SSH END]');
    })
    .on('close', () => {
      console.log('[SSH CLOSE]');
      setTimeout(() => {
        new Ssh(config);
      }, 1000);
    })
    .connect({
      host: '$HOST_IP',
      port: 443,
      username: '$USERNAME',
      privateKey: privateKey,
      keepaliveInterval: 10000
    });
  }
  forwardIn(config) {
    this.conn.forwardIn('0.0.0.0', config.remotePort, (err) => {
      console.log(`connect forwardIn ${config.remotePort}`);
      if (err) {
        console.log(err);
        this.conn.exec(`kill $(netstat -t4lnp | grep "${config.remotePort}" | grep -o "[0-9]*/sshd" | grep -o "[0-9]*")`, (err, stream) => {
          if (err) console.log(err);
          stream.on('data', (data) => {
            console.log(data.toString('utf8'));
          }).on('close', () => {
            setTimeout(()=> {
              this.forwardIn(config);
            }, 1000);
          });
        })
      } else {
        console.log(`Listening for connections on server on port ${config.remotePort}!`);
      }
    });
  }
}

config.rules.map((conf) => new Ssh(conf));
