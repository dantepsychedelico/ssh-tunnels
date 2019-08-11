# SSH Tunnels Client for GCP

## Create VM

```
$ ./setup.sh
```

## Build exe

```
$ npm run build -- --targets node12-win-x64 --output app.exe
```

## Upload exe to bucket

```
$ gsutil cp app.exe gs://$BUCKET_NAME/app.exe
```
