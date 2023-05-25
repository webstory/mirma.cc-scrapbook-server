import fastify, { FastifyRequest } from 'fastify';
import cors from '@fastify/cors';

import { AssetClient } from './asset';
import config from './config';

import { files, pools } from './database';

import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

// Global config
const assets = new AssetClient(
  {
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  },
  config.bucket
);

const app = fastify({ logger: false });
app.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Width', 'X-Height', 'X-Range'],
});

app.get(
  '/img/local/*',
  async (
    request: FastifyRequest<{
      Params: { '*': string };
    }>,
    reply
  ) => {
    // Get the full path
    const subpath = request.params['*'];
    const fullPath = path.join(config.local, subpath);

    if (fs.existsSync(fullPath)) {
      const buffer = fs.readFileSync(fullPath);
      // const stream = fs.createReadStream(fullPath); // Buggy
      const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
      reply.code(200).type(mimeType).send(buffer);
    } else {
      reply.code(404).send('Not found');
    }
  }
);

app.get(
  '/img/from-archive/*',
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
      const metadata = await assets.head(path);
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
      const res = await assets.get(path, { range: [start, end] });
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
        res = await assets.get(path, { etag: request.headers['if-none-match'] });
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
    const url = await assets.getSignedUrl(path);
    if (url) reply.redirect(302, url);
    else reply.code(404).send('Not found');
  }
);

app.get('/search/tags', async (request, reply) => {
  const query = request.query as { q?: string; before?: string };
  if (!query.q) {
    reply.code(400).send('Bad request');
    return;
  }
  const tags = query.q.split(',').map((tag) => tag.trim().toLowerCase());

  let before = Date.now();
  if (query.before && /^\d+$/.test(query.before)) {
    before = Number(query.before);
  }

  const res = await files
    .find({ tags: { $all: tags }, create_timestamp: { $lte: before } })
    .sort({ create_timestamp: -1 })
    .limit(50)
    .toArray();
  reply.send(res);
});

app.get('/', async (_request, reply) => {
  reply.send('Server is running');
});

async function main() {
  await app.listen({ port: Number(process.env.PORT || 3000) }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  });
}

main();
