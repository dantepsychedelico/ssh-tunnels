#!/bin/bash

create_network() {
    echo '[CREATE] custom networks'
    gcloud compute networks create $NIC_NAME --project $PROJECT_ID
}

create_firewall() {
    echo '[CREATE] firewall'
    gcloud compute firewall-rules create $NIC_NAME-allow-ssh \
        --project $PROJECT_ID \
        --network $NIC_NAME --allow tcp:22
    gcloud compute firewall-rules create $NIC_NAME-allow-https \
        --project $PROJECT_ID \
        --network $NIC_NAME --allow tcp:443
}

create_vm() {
    echo '[CREATE] instance'
    gcloud compute instances create \
        --project=$PROJECT_ID $INSTANCE_NAME \
        --machine-type=f1-micro --preemptible \
        --zone=asia-east1-a --network=$NIC_NAME \
        --no-service-account --no-scopes \
        --metadata=enable-oslogin=TRUE \
        --labels=app=$INSTANCE_NAME
    zone=asia-east1-a instance_name=$INSTANCE_NAME npm run replace-config -- config-tpl.json
}

create_service_account() {
    echo '[CREATE] service account'
    gcloud iam service-accounts create $SERVICE_ACCOUNT \
        --project $PROJECT_ID --display-name $SERVICE_ACCOUNT
}

create_bucket() {
    echo '[CRATE] bucket'
    gsutil mb -p $PROJECT_ID -c regional -l asia-east1 -b on gs://$BUCKET_NAME/
}

change_vm_sshd_listen_port() {
    echo '[MODIFY] change ssh port to 443'
    gcloud compute ssh --project=$PROJECT_ID $INSTANCE_NAME \
        --command="sudo sed -i 's/#Port 22/Port 443/' /etc/ssh/sshd_config && \
        sudo systemctl restart sshd"
}

add_iam_role_for_service_account() {
    gcloud compute instances add-iam-policy-binding $INSTANCE_NAME \
        --project $PROJECT_ID --zone asia-east1-a \
        --member serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com \
        --role='roles/compute.osAdminLogin' \
        --role='roles/compute.viewer'
}

create_service_account_keys() {
    gcloud iam service-accounts keys create ./cert/gcp-sa.json \
        --project $PROJECT_ID \
        --iam-account $SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com
}

upload_config_to_bucket() {
    gsutil cp cert/config.json gs://$BUCKET_NAME
}

attach_bucket_permission() {
    gsutil bucketpolicyonly set on gs://$BUCKET_NAME
    gsutil iam ch serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com:roles/storage.objectViewer gs://$BUCKET_NAME
    echo "$(cat cert/gcp-sa.json | jq '. += {"bucket_name": "zac-chung-dev-ssh-tunnels"}')" > cert/gcp-sa.json
}

create_ssh_key_for_service_account() {
    ssh-keygen -N '' -f cert/id_rsa
    gcloud compute os-login ssh-keys add --key-file=cert/id_rsa.pub \
        --account=$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com
    username="$(gcloud compute os-login describe-profile --format=json | jq '.posixAccounts[0].username' | sed 's/"//g')" \
        private_key="$(cat cert/id_rsa)" npm run replace-config -- config.json
}
