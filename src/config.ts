import fs from 'fs';
import toml from 'toml';
import { S3ClientConfig } from '@aws-sdk/client-s3';

export interface ApplicationConfig {
  db: {
    mongodb: string;
    dbname: string;
  };
  s3: S3ClientConfig & {
    bucket: string;
  };
  local: string;
  [key: string]: unknown;
}

const config = toml.parse(fs.readFileSync('config.toml', 'utf-8')) as ApplicationConfig;

export default config;
