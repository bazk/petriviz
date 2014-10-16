#!/bin/bash

BUCKET="petriviz.bazk.me"

s3cmd sync \
    --delete-removed \
    --acl-public \
    --reduced-redundancy \
    --exclude '.git/*' \
    --exclude '.gitignore' \
    --exclude '*.swp' \
    --exclude 'scripts/*' \
    . \
    s3://$BUCKET

s3cmd put \
    --mime-type="text/cache-manifest" \
    cache.manifest \
    s3://$BUCKET
