#!/bin/bash

script_path="$(readlink -f $(dirname $0))"
bucket="petriviz.bazk.me"

cd "${script_path}/.."
s3cmd sync \
    --delete-removed \
    --acl-public \
    --reduced-redundancy \
    --exclude '.git/*' \
    --exclude '.gitignore' \
    --exclude '*.swp' \
    --exclude 'scripts/*' \
    . \
    "s3://${bucket}"

cd "${script_path}"
s3cmd put \
    --acl-public \
    --reduced-redundancy \
    --mime-type="text/cache-manifest" \
    cache.manifest \
    "s3://${bucket}"
