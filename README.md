# cloudinary-memory-server

An in-memory mock server compatible with Cloudinary SDK methods for uploading
and retrieving files.

_NOTE: No transformations are performed; the raw file is always returned._

## Usage

### Start the server

From the cli:

```sh
npx @ceteio/cloudinary-memory-server
```

or, in JS:

```sh
yarn add @ceteio/cloudinary-memory-server
```

```javascript
const cloudinaryMemServer = require("@ceteio/cloudinary-memory-server");
cloudinaryMemServer();
```

### Connect to the server

```javascript
const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: "na",
  api_key: "na",
  api_secret: "na",
  upload_prefix: "https://localhost:9443"
});
```

_(NOTE: See [SSL certificates](#ssl-certificates) below for important information to avoid SSL errors)_

## Supported endpoints

| Method | Path                                            |
| ------ | ----------------------------------------------- |
| GET    | /:cloudname/image/upload/:public_id             |
| POST   | /:api_version/:cloudname/image/upload           |
| DELETE | /:api_version/:cloudname/resources/image/upload |

## SSL certificates

The `cloudinary` node module (and possibly other languages also) require the
`upload_prefix` to be a secure URL (ie; `https`). By default,
`cloudinary-memory-server` will generate an SSL certificate to enable the secure
URL.

However, this certificate will be regenerated each time
`cloudinary-memory-server` is run, requiring manual approval in your browswer
before images will load.

To skip the approval step, it's possible to create and install a permanent
trusted certificate which can then be passed into `cloudinary-memory-server`.

### Installing a trusted SSL certificate for localhost

The recommended tool is [`mkcert`](https://github.com/FiloSottile/mkcert):

1. [Install `mkcert`](https://github.com/FiloSottile/mkcert#installation)
2. Setup the RootCA:
   ```sh
   mkcert -install
   ```
3. Create the certificates:
   ```sh
   cd <your-project-dir>
   mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 ::1
   ```
4. Add .pem files to .gitignore:
   ```sh
   echo '*.pem' >> .gitignore
   ```
5. Pass the certificate files to `cloudinary-memory-server`:
   ```sh
   SSL_KEY_FILE=localhost-key.pem SSL_CERT_FILE=localhost.pem npx @ceteio/cloudinary-memory-server
   ```
   or, in JavaScript:
   ```javascript
   const cloudinaryMemServer = require("@ceteio/cloudinary-memory-server");
   cloudinaryMemServer({
     sslKeyFile: "./localhost-key.pem",
     sslCertFile: "./localhost.pem"
   });
   ```

### Calling https URL from Node

When using the node `cloudinary` client, it is important to tell node that the
SSL certificate used by `cloudinary-memory-server` can be trusted. How you do
that depends on how you're setting up your SSL certificates.

#### With `mkcert` installed certificate

Node does not use the system root store, so it won't accept mkcert certificates
automatically. Instead, you will have to set the
[`NODE_EXTRA_CA_CERTS`](https://nodejs.org/api/cli.html#cli_node_extra_ca_certs_file)
environment variable.

Given your node script is setup like so:

```javascript
// index.js
const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: "na",
  api_key: "na",
  api_secret: "na",
  upload_prefix: "https://localhost:9443"
});
```

Run it with the environment variable set:

```sh
NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem" node index.js
```

#### With default, temporary certificate (insecure)

Set the `NODE_TLS_REJECT_UNAUTHORIZED` env var, which tells node to trust _all_
SSL certificates. This will trust the automatically generated certificate, but
will also trust _any_ https connection even if it would normally throw an error.
This can pose a risk of Man In The Middle (MITM) attacks, and should be
considered insecure.

Given your node script is setup like so:

```javascript
// index.js
const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: "na",
  api_key: "na",
  api_secret: "na",
  upload_prefix: "https://localhost:9443"
});
```

Run it insecurely with the environment variable set:

```sh
NODE_TLS_REJECT_UNAUTHORIZED=0 node index.js
```

## Thanks

- [@romajs](https://github.com/romajs) for
  [`cloudinary-mock`](https://github.com/romajs/cloudinary-mock):
  `cloudinary-memory-server` wouldn't be possible without it!
