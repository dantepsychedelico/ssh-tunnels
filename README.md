# SSH Tunnels Client for GCP

## Create VM

replace `[PROJECT_ID]` to your project_id and
`[INSTANCE_NAME]` to your preferred instance_name

```
$ PROJECT_ID=[PROJECT_ID] INSTANCE_NAME=[INSTANCE_NAME] ./setup.sh
```

## Build exe

```
$ npm run build -- --targets node12-win-x64 --output app.exe
```

## Upload config to bucket

```
$ gsutil cp config.json gs://$BUCKET_NAME
```

## Upload exe to bucket

```
$ gsutil cp app.exe gs://$BUCKET_NAME/app.exe
```
