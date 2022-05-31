const bodyParser = require("body-parser");
const express = require("express");
const expressWinston = require("express-winston");
const fileType = require("file-type");
const fileUpload = require("express-fileupload");
const https = require("https");
const imageSize = require("image-size");
const randomstring = require("randomstring");
const winston = require("winston");
const fs = require("fs");
const path = require("path");
const execa = require("execa");
const tmp = require("tmp");

// Ensure temp directories are cleaned up on process exit
tmp.setGracefulCleanup();

module.exports = function({
  port = process.env.HTTPS_PORT || 9443,
  host = process.env.UPLOAD_HOST || "https://localhost:" + port,
  sslKeyFile = process.env.SSL_KEY_FILE,
  sslCertFile = process.env.SSL_CERT_FILE,
  logLevel = process.env.LOG_LEVEL || "info"
} = {}) {
  const files = new Map();
  const app = express();

  const logger = new winston.Logger({
    transports: [
      new winston.transports.Console({
        colorize: true,
        timestamp: true
      })
    ],
    level: logLevel,
    exitOnError: false,
    expressFormat: true,
    colorize: true
  });

  if (!sslKeyFile || !sslCertFile) {
    logger.info(
      `Using temporary SSL certificate for the life of this process. To avoid browser warnings, see README.md for instructions on installing a trusted localhost certificate.`
    );

    // Generating SSL certs
    const tmpobj = tmp.dirSync();
    const keyTmpPem = path.join(tmpobj.name, "keytmp.pem");
    sslCertFile = path.join(tmpobj.name, "cert.pem");
    sslKeyFile = path.join(tmpobj.name, "key.pem");
    execa.sync("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-keyout",
      keyTmpPem,
      "-out",
      sslCertFile,
      "-days",
      "365",
      "-nodes",
      "-batch"
    ]);
    execa.sync("openssl", ["rsa", "-in", keyTmpPem, "-out", sslKeyFile]);
  }

  const options = {
    key: fs.readFileSync(path.resolve(sslKeyFile)),
    cert: fs.readFileSync(path.resolve(sslCertFile))
  };

  app.use(
    bodyParser.urlencoded({
      extended: false
    })
  );

  app.use(bodyParser.json());

  app.use(fileUpload());

  function getter(req, res) {
    const cloudname = req.params.cloudname;
    // may have an optional file extension
    const public_id = req.params.public_id.split(".")[0];
    const publicIdPath = [cloudname, public_id].join("/");
    logger.debug("publicIdPath:", publicIdPath);

    if (!files.has(publicIdPath)) {
      return res.status(404).end();
    }

    const { data, mime } = files.get(publicIdPath);

    res.type(mime);
    res.status(200);
    return res.send(data);
  }

  app.get("/:cloudname/image/upload/:transform/:public_id", getter);
  app.get("/:cloudname/image/upload/:public_id", getter);

  app.post("/:api_version/:cloudname/image/upload", function(req, res) {
    if (!req.files || !req.files.file) {
      return res.status(400).send("No files were uploaded.");
    }

    const public_id = randomstring.generate(20);
    logger.debug("public_id:", public_id);

    const version = randomstring.generate({ length: 10, charset: "numeric" });
    logger.debug("version:", version);

    const cloudname = req.params.cloudname;
    logger.debug("cloudname:", cloudname);

    const file = req.files.file;
    logger.info('incoming file: size=%s bytes, md5="%s"', file.size, file.md5);

    const fileTypeInfo = fileType(file.data);
    logger.debug("fileTypeInfo:", fileTypeInfo);

    const dimensions = imageSize(file.data);

    const url = [
      host,
      cloudname,
      "image",
      "upload",
      "v" + version,
      public_id
    ].join("/");

    const meta = {
      public_id: public_id,
      version: version,
      signature: randomstring.generate(40),
      width: dimensions.width,
      height: dimensions.height,
      format: fileTypeInfo.ext,
      resource_type: fileTypeInfo.mime.split("/")[0],
      original_filename: file.name,
      url: url,
      secure_url: url,
      bytes: file.size,
      etag: file.md5,
      created_at: new Date().toISOString(),
      placeholder: false,
      type: "upload"
    };

    // File was successfully uploaded and dimension information parsed: save
    // the data for later retrieval
    const publicIdPath = [cloudname, public_id].join("/");
    logger.debug("publicIdPath: ", publicIdPath);
    files.set(publicIdPath, { data: file.data, mime: fileTypeInfo.mime });

    logger.info("file uploaded and accessible via: ", url);

    return res.status(200).send(meta);
  });

  app.delete("/:api_version/:cloudname/resources/image/upload", function(
    req,
    res
  ) {
    const cloudname = req.params.cloudname;
    logger.debug("cloudname:", cloudname);

    const public_ids = req.body["public_ids[]"];
    logger.debug("public_ids: ", public_ids);

    if (typeof public_ids === "string") {
      public_ids = [public_ids];
    }

    const jsonResponse = {
      partial: null,
      rate_limit_allowed: null,
      rate_limit_reset_at: null,
      rate_limit_remaining: null
    };

    public_ids.forEach(function(public_id) {
      try {
        logger.debug("public_id:", public_id);

        const publicIdPath = [cloudname, public_id].join("/");
        logger.debug("publicIdPath:", publicIdPath);

        if (!files.has(publicIdPath)) {
          return (jsonResponse[public_id] = "not_found");
        }

        files.delete(publicIdPath);

        jsonResponse[public_id] = "deleted";
      } catch (err) {
        jsonResponse[public_id] = "error";
      }
    });

    return res.status(200).send(jsonResponse);
  });

  app.get("/ping", function(req, res) {
    return res.status(200).end();
  });

  app.use(
    expressWinston.errorLogger({
      winstonInstance: logger,
      exitOnError: false,
      expressFormat: true,
      colorize: true
    })
  );

  return new Promise(resolve => {
    https.createServer(options, app).listen(port, function() {
      logger.info(`Cloudinary Memory Server ready on ${host}`);
      resolve({ app, host, port });
    });
  });
};
