import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  S3Client,
  S3ClientConfig,
  GetObjectCommand,
  GetObjectCommandOutput,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  S3ServiceException,
} from '@aws-sdk/client-s3';

export class AssetClient {
  private s3: S3Client;
  private bucket: string;
  private prefix: string;

  constructor(config: S3ClientConfig, bucket: string, prefix: string = '') {
    this.s3 = new S3Client(config);
    this.bucket = bucket;
    this.prefix = prefix;
  }

  async get(key: string, options?: { etag?: string; range?: [number, number] }): Promise<GetObjectCommandOutput | undefined> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: this.prefix + key,
      IfNoneMatch: options?.etag,
      Range: options?.range ? `bytes=${options.range[0]}-${options.range[1]}` : undefined,
    });

    try {
      const data = await this.s3.send(command);
      return data;
    } catch (err) {
      if (err instanceof S3ServiceException) {
        throw err.name;
      } else {
        console.error(err);
        return undefined;
      }
    }
  }

  async getSignedUrl(key: string, options?: { [key: string]: string | number }): Promise<string | undefined> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: this.prefix + key,
      ...options,
    });

    const signedUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 }); // 1 hour expiration

    return signedUrl;
  }

  async head(key: string): Promise<HeadObjectCommandOutput | undefined> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: this.prefix + key,
    });

    try {
      const data = await this.s3.send(command);
      return data;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }
}
