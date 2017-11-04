# cloudinary-mock

## Usage

```javascript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

var cloudinary = require('cloudinary')

cloudinary.config({
  cloud_name : 'na',
  api_key : 'na',
  api_secret : 'na',
  upload_prefix: 'https://0.0.0.0:9443'
})
```

## Supported endpoints

Method | Path
-------|------
GET    | /:cloudname/image/upload/:public_id
POST   | /:api_version/:cloudname/image/upload
DELETE | /:api_version/:cloudname/resources/image/upload

## Development

```bash
./build.sh
./run.sh
```
