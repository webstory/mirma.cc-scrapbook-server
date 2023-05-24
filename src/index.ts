import fastify, { FastifyRequest } from 'fastify';
import cors from '@fastify/cors';

import { AssetClient } from './asset';
import * as fs from 'fs';
import toml from '@iarna/toml';
import { S3ClientConfig } from '@aws-sdk/client-s3';

// Global config
const config = toml.parse(fs.readFileSync('config.toml', 'utf-8')) as any;
const IBAssetClient = new AssetClient(config.s3 as S3ClientConfig, config.s3.bucket, config.s3.prefix);

const app = fastify({ logger: false });
app.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Width', 'X-Height', 'X-Range'],
});

app.get(
  '/img/*',
  async (
    request: FastifyRequest<{
      Params: { '*': string };
    }>,
    reply
  ) => {
    // Get the full path
    const path = request.params['*'];
    console.log({ path });

    // Check if it's a range request
    const range = request.headers.range;
    if (range && range.startsWith('bytes=')) {
      // Fetch the object size from S3
      const metadata = await IBAssetClient.head(path);
      if (!metadata || !metadata.ContentLength) {
        reply.code(404).send('Not found');
        return;
      }
      let start = -1;
      let end = metadata.ContentLength - 1;

      const [rangeStart, rangeEnd] = range.replace('bytes=', '').split('-');
      start = parseInt(rangeStart, 10);
      end = rangeEnd ? parseInt(rangeEnd, 10) : end;
      // Get stream from S3 with range
      const res = await IBAssetClient.get(path, { range: [start, end] });
      if (res) {
        reply
          .code(206)
          .type(res.ContentType || 'application/octet-stream')
          .send('');
      } else {
        reply.code(404).send('Not found');
      }
    } else {
      let res;
      try {
        res = await IBAssetClient.get(path, { etag: request.headers['if-none-match'] });
      } catch (err) {
        console.error(err);
        if (err === '304') {
          reply.code(304).send('Not modified');
          return;
        }
        reply.code(500).send('Internal server error');
        return;
      }
      if (res) {
        if (res.Body) {
          const buffer = Buffer.from(await res.Body.transformToByteArray());
          reply
            .code(200)
            .headers({
              'Content-Type': res.ContentType || 'application/octet-stream',
              'Content-Length': res.ContentLength || 0,
              ETag: res.ETag || '',
              ...(res.Metadata || {}),
            })
            .send(buffer);
        } else {
          reply.code(304).send('Not modified');
        }
      } else {
        reply.code(404).send('Not found');
      }
    }
  }
);

app.get(
  '/signed-url/*',
  async (
    request: FastifyRequest<{
      Params: { '*': string };
    }>,
    reply
  ) => {
    const path = request.params['*'];
    const url = await IBAssetClient.getSignedUrl(path);
    if (url) reply.redirect(302, url);
    else reply.code(404).send('Not found');
  }
);

app.get('/', async (_request, reply) => {
  const res = await IBAssetClient.get('Yupa/2540403_Yupa_4-1.jpg');
  if (res && res.Body) {
    const buffer = Buffer.from(await res.Body.transformToByteArray());
    reply
      .headers({
        'Content-Type': res.ContentType || 'application/octet-stream',
        'Content-Length': res.ContentLength || 0,
        ETag: res.ETag || '',
        ...(res.Metadata || {}),
      })
      .send(buffer);
  } else {
    reply.code(404).send('Not found');
  }
});

async function main() {
  await app.listen({ port: 3000 }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  });
}

main();
