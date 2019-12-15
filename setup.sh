#!/bin/bash

[ -z $PROJECT_ID ] && echo "NOT FOUND PROJECT_ID" && exit 1
[ -z $INSTANCE_NAME ] && echo "NOT FOUND INSTANCE_NAME" && exit 1

BUCKET_NAME=$PROJECT_ID-$INSTANCE_NAME
SERVICE_ACCOUNT=$INSTANCE_NAME
NIC_NAME=$INSTANCE_NAME-nic

source helper.sh

main() {
    mkdir -p cert
    create_network
    create_firewall
    create_vm
    create_service_account
    create_bucket
    add_iam_role_for_service_account
    change_vm_sshd_listen_port
    create_service_account_keys
    create_ssh_key_for_service_account
#     upload_config_to_bucket
#     attach_bucket_permission
}

main
