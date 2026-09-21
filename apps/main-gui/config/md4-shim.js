"use strict";

// webpack 4 fingerprints build artifacts with md4 in places that aren't
// configurable (ModuleFilenameHelpers, SourceMapDevToolPlugin). OpenSSL 3,
// bundled with Node 17 and later, no longer provides md4, so those calls fail
// with ERR_OSSL_EVP_UNSUPPORTED. Where md4 is missing, fall back to md5. These
// hashes identify build output; they are never security material.
//
// Must be required before webpack. Remove this on the move to webpack 5.

const crypto = require("crypto");

const createHash = crypto.createHash;

try {
  createHash("md4");
} catch (err) {
  crypto.createHash = function (algorithm, options) {
    return createHash(algorithm === "md4" ? "md5" : algorithm, options);
  };
}
