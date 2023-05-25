# Furry site favorite explorer server

This is a simple server that serves your favorites from scraped into the s3 bucket. Submission metadata is stored into the MongoDB database.

## Features(with TODOs)

- [x] Search metadata
- [x] View submission from local filesystem
- [x] View submission as proxy
- [x] View submission by SignedURL

## Features not planned

- Posting submission(s)
- View comments

## Supported sites

Followes the same list as [furry-site-favorite-scraper](https://github.com/webstory/mirma.cc-scrapbook-utils)

## Querying

Sites is distinguished by the `provider` field in the submission metadata.

Artist name is tagged as `artist:{artist name}` tag. Or you can use a dedicated query as `username:{artist name}` instead.

## Installation

1. Setup

   1. Copy `config.toml.example` to `config.toml`
   2. Fill in the values

```toml
# Image downloaded directory
# Directory structure like thid below:
# ../res
#   |- inkbunny
#   |  |- artist_name
#   |     |- submission_file.jpg
#   |
#   |- furaffinity
#      |- artist_name
#         |- submission_file.jpg
local = "../res"

[db]
mongodb = "mongodb://localhost:27017"
dbname = "scrapbook"

# If you store your files into the s3 bucket, fill this below
[s3]
# region = "us-west-4"
endpoint = "https://s3.us-west-004.backblazeb2.com"
bucket = "my-bucket"
prefix = "prefix/"

[s3.credentials]
accessKeyId = "AWS access key ID"
secretAccessKey = "AWS secret access key ID"
```

2. Install dependencies and run

```bash
npm install
npm run build
npm run dev # or npm start
```

## Frameworks

- [Fastify](https://www.fastify.io/)
- [@aws-sdk/client-s3](https://www.npmjs.com/package/@aws-sdk/client-s3)

## LICENSE

MIT
